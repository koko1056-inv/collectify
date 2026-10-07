-- 交流・探索・シリーズ進捗のための追加スキーマ（すべて加算のみ。既存データは変更しない）
--
--  1. item_post_reactions : 「持ってる / ほしい / 尊い」の1タップ反応
--     コメントや画像投稿より手間が少なく、投稿者へ「同担がいた」が必ず届く。
--  2. get_collection_progress : シリーズ別の所持数 / カタログ総数
--  3. search_official_items_with_owners : グッズ名で横断検索し、持ち主の数も返す
--  4. get_recent_registrations : 直近に登録された公開コレクションの新着ストリップ

-- ---------------------------------------------------------------
-- 1. 反応
-- ---------------------------------------------------------------
create table if not exists public.item_post_reactions (
  post_id uuid not null references public.item_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('have', 'want', 'love')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create index if not exists item_post_reactions_post_idx
  on public.item_post_reactions (post_id);
create index if not exists item_post_reactions_user_idx
  on public.item_post_reactions (user_id);

alter table public.item_post_reactions enable row level security;

drop policy if exists item_post_reactions_select_all on public.item_post_reactions;
create policy item_post_reactions_select_all
  on public.item_post_reactions for select using (true);

drop policy if exists item_post_reactions_insert_own on public.item_post_reactions;
create policy item_post_reactions_insert_own
  on public.item_post_reactions for insert with check (user_id = auth.uid());

drop policy if exists item_post_reactions_delete_own on public.item_post_reactions;
create policy item_post_reactions_delete_own
  on public.item_post_reactions for delete using (user_id = auth.uid());

-- 投稿者への通知。付けて外してを繰り返しても通知が積み上がらないよう、
-- 同じ人・同じ投稿・同じ反応の未読通知がある間は新しく作らない。
create or replace function public.notify_item_post_reaction()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  post_owner_id uuid;
  actor_name text;
  label text;
begin
  select user_id into post_owner_id from public.item_posts where id = new.post_id;
  if post_owner_id is null or post_owner_id = new.user_id then
    return new;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.user_id = post_owner_id
      and n.type = 'item_post_reaction'
      and n.is_read = false
      and n.data->>'post_id' = new.post_id::text
      and n.data->>'actor_id' = new.user_id::text
      and n.data->>'kind' = new.kind
  ) then
    return new;
  end if;

  select coalesce(display_name, username, 'コレクター') into actor_name
  from public.profiles where id = new.user_id;

  label := case new.kind
    when 'have' then 'も持ってる！'
    when 'want' then 'がほしいと思っています'
    else 'が「尊い」と感じています'
  end;

  insert into public.notifications (user_id, type, title, message, data, is_read)
  values (
    post_owner_id,
    'item_post_reaction',
    case new.kind when 'have' then '同担がいました' else 'リアクション' end,
    coalesce(actor_name, '誰か') || 'さん' || label,
    jsonb_build_object(
      'post_id', new.post_id,
      'actor_id', new.user_id,
      'kind', new.kind,
      'link', '/post/' || new.post_id::text
    ),
    false
  );
  return new;
end;
$function$;

drop trigger if exists trg_notify_item_post_reaction on public.item_post_reactions;
create trigger trg_notify_item_post_reaction
  after insert on public.item_post_reactions
  for each row execute function public.notify_item_post_reaction();

-- ---------------------------------------------------------------
-- 共通: 「このユーザーのコレクションを見てよいか」
-- ---------------------------------------------------------------
create or replace function public.can_view_collection(_owner uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    _owner = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = _owner
        and (
          p.privacy_level = 'public'
          or (
            p.privacy_level = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid() and f.following_id = _owner
            )
          )
        )
    );
$function$;

revoke all on function public.can_view_collection(uuid) from public, anon;
grant execute on function public.can_view_collection(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 公式グッズ → 作品名 の対応（作品名は3経路で集める。find_trade_series_partners と同じ考え方）
--   1. official_items.content_name
--   2. category='series' のタグ
-- 「なし」は未設定を表す仮タグなので作品として数えない。
-- ---------------------------------------------------------------
create or replace function public.official_item_series()
returns table (official_item_id uuid, series_label text, series_key text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select oi.id, btrim(oi.content_name), lower(btrim(oi.content_name))
  from public.official_items oi
  where oi.merged_into is null
    and oi.content_name is not null and btrim(oi.content_name) not in ('', 'なし')
  union
  select oi.id, btrim(t.name), lower(btrim(t.name))
  from public.official_items oi
  join public.item_tags it on it.official_item_id = oi.id
  join public.tags t on t.id = it.tag_id and t.category = 'series'
  where oi.merged_into is null
    and t.name is not null and btrim(t.name) not in ('', 'なし');
$function$;

revoke all on function public.official_item_series() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 2. シリーズ別の所持数 / 総数
-- ---------------------------------------------------------------
create or replace function public.get_collection_progress(_user_id uuid default null)
returns table (
  series_label text,
  owned integer,
  total integer,
  last_added_at timestamptz,
  cover_image text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  if target is null or not public.can_view_collection(target) then
    return;
  end if;

  return query
  with s as (
    select * from public.official_item_series()
  ),
  totals as (
    select s.series_key, min(s.series_label) as series_label,
           count(distinct s.official_item_id)::integer as total
    from s group by s.series_key
  ),
  mine as (
    select s.series_key,
           count(distinct ui.official_item_id)::integer as owned,
           max(ui.created_at) as last_added_at,
           (array_agg(coalesce(ui.image, oi.image) order by ui.created_at desc)
              filter (where coalesce(ui.image, oi.image) is not null))[1] as cover_image
    from public.user_items ui
    join s on s.official_item_id = ui.official_item_id
    join public.official_items oi on oi.id = ui.official_item_id
    where ui.user_id = target
    group by s.series_key
  )
  select t.series_label, m.owned, greatest(t.total, m.owned), m.last_added_at, m.cover_image
  from mine m join totals t using (series_key)
  order by m.owned desc, t.total desc, t.series_label;
end;
$function$;

revoke all on function public.get_collection_progress(uuid) from public, anon;
grant execute on function public.get_collection_progress(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3. グッズ横断検索（持ち主の数つき）
-- ---------------------------------------------------------------
create or replace function public.search_official_items_with_owners(
  _q text,
  _limit integer default 30
)
returns table (
  id uuid,
  title text,
  image text,
  content_name text,
  owner_count integer,
  trade_count integer,
  i_own boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with q as (
    select '%' || replace(replace(replace(btrim(_q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  ),
  hits as (
    select oi.id, oi.title, oi.image, oi.content_name
    from public.official_items oi, q
    where oi.merged_into is null
      and length(btrim(_q)) >= 1
      and (
        oi.title ilike q.pat
        or oi.content_name ilike q.pat
        or exists (
          select 1 from public.item_tags it
          join public.tags t on t.id = it.tag_id
          where it.official_item_id = oi.id and t.name ilike q.pat
        )
      )
    limit 300
  )
  select h.id, h.title, h.image, h.content_name,
         coalesce(o.owners, 0)::integer,
         coalesce(o.tradable, 0)::integer,
         coalesce(o.mine, false)
  from hits h
  left join lateral (
    select count(distinct ui.user_id) filter (where public.can_view_collection(ui.user_id)) as owners,
           count(distinct ui.user_id) filter (
             where ui.for_trade and public.can_view_collection(ui.user_id)
           ) as tradable,
           bool_or(ui.user_id = auth.uid()) as mine
    from public.user_items ui
    where ui.official_item_id = h.id
  ) o on true
  order by coalesce(o.owners, 0) desc, h.title
  limit least(greatest(_limit, 1), 60);
$function$;

revoke all on function public.search_official_items_with_owners(text, integer) from public, anon;
grant execute on function public.search_official_items_with_owners(text, integer) to authenticated;

-- ---------------------------------------------------------------
-- 4. 新着登録（公開コレクションのみ）
-- ---------------------------------------------------------------
create or replace function public.get_recent_registrations(_limit integer default 12)
returns table (
  user_item_id uuid,
  official_item_id uuid,
  title text,
  image text,
  content_name text,
  created_at timestamptz,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select ui.id, ui.official_item_id,
         coalesce(oi.title, ui.title), coalesce(ui.image, oi.image),
         coalesce(nullif(btrim(ui.content_name), ''), oi.content_name),
         ui.created_at, p.id, p.username, p.display_name, p.avatar_url
  from public.user_items ui
  join public.profiles p on p.id = ui.user_id
  left join public.official_items oi on oi.id = ui.official_item_id
  where p.privacy_level = 'public'
    and coalesce(ui.image, oi.image) is not null
  order by ui.created_at desc
  limit least(greatest(_limit, 1), 40);
$function$;

revoke all on function public.get_recent_registrations(integer) from public, anon;
grant execute on function public.get_recent_registrations(integer) to authenticated;
