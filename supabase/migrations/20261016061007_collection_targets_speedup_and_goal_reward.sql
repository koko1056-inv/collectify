-- コンプの「小さな的」（get_collection_targets）を速くし、はじめてガイドの「集めるもの」に報酬を付ける。
--
-- 【速さ】20261016060445 を本番に入れて測ると、いちばんグッズの多い利用者（123件・的36個）で 3.7 秒かかった。
--   - 2つのタグの組み合わせ（キャラ×種類など）を、行ごとの EXISTS でタグ名から引き直していた（1つの的で 155ms）。
--     → 先にタグの id を配列で引き、(official_item_id, tag_id) の一意索引で確かめる（8ms）
--   - 1つの的につき collection_target_members を3回（分母・持っている数・足りないグッズ）呼んでいた
--     → 1回だけ呼んで、結果を使い回す
--   返す形は変えない（アプリの変更は要らない）。
--
-- 【報酬】目標が DB（collection_goals）に入ったので、サーバーで達成を確かめられる。
--   goal（集めるものを1つ以上決めた）に +10pt。アプリは onboarding_reward_steps を読んで額を出す。

create or replace function public.collection_target_members(_c1 text, _k1 text, _c2 text default null, _k2 text default null)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select distinct it1.official_item_id
    from public.item_tags it1
    join public.official_items oi on oi.id = it1.official_item_id and oi.merged_into is null
   where it1.tag_id = any (array(select t.id from public.tags t where t.category = _c1 and lower(btrim(t.name)) = _k1))
     and (
       _k2 is null
       or exists (
         select 1
           from public.item_tags it2
          where it2.official_item_id = it1.official_item_id
            and it2.tag_id = any (array(select t.id from public.tags t where t.category = _c2 and lower(btrim(t.name)) = _k2))
       )
     );
$function$;

revoke all on function public.collection_target_members(text, text, text, text) from public, anon, authenticated;

create or replace function public.get_collection_targets(_user_id uuid default null)
returns table(
  kind text,
  work text,
  series text,
  "character" text,
  type text,
  owned integer,
  total integer,
  cover_image text,
  missing jsonb
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  -- 見せてはいけない相手の棚なら何も返さない（get_collection_progress と同じ判定）
  if target is null or not public.can_view_collection(target) then
    return;
  end if;

  return query
  with my as materialized (
    -- 持っている公式グッズ（統合済みは数えない）。同じグッズを2行持っていても1つ
    select distinct on (ui.official_item_id)
           ui.official_item_id as oid,
           ui.created_at,
           coalesce(nullif(ui.image, ''), oi.image) as img
      from public.user_items ui
      join public.official_items oi on oi.id = ui.official_item_id and oi.merged_into is null
     where ui.user_id = target
     order by ui.official_item_id, ui.created_at desc
  ),
  my_tags as (
    select m.oid, t.category, btrim(t.name) as name, lower(btrim(t.name)) as k
      from my m
      join public.item_tags it on it.official_item_id = m.oid
      join public.tags t on t.id = it.tag_id
     where t.category in ('series', 'character', 'type')
       and t.name is not null
       and btrim(t.name) not in ('', 'なし')
  ),
  cand as (
    -- シリーズ（すべて。分母はたいてい小さい）
    select 'series'::text as kd, 'series'::text as c1, s.k as k1, null::text as c2, null::text as k2,
           min(s.name) as n1, null::text as n2, count(distinct s.oid) as score
      from my_tags s
     where s.category = 'series'
     group by s.k
    union all
    -- キャラ（持っている数の多い6つ）
    (select 'character', 'character', c.k, null, null, min(c.name), null, count(distinct c.oid)
       from my_tags c
      where c.category = 'character'
      group by c.k
      order by count(distinct c.oid) desc, c.k
      limit 6)
    union all
    -- キャラ×種類（例: ハチワレのアクリルスタンド。8つ）
    (select 'character_type', 'character', c.k, 'type', ty.k, min(c.name), min(ty.name), count(distinct c.oid)
       from my_tags c
       join my_tags ty on ty.oid = c.oid and ty.category = 'type'
      where c.category = 'character'
      group by c.k, ty.k
      order by count(distinct c.oid) desc, c.k, ty.k
      limit 8)
    union all
    -- シリーズ×キャラ（4つ）
    (select 'series_character', 'series', s.k, 'character', c.k, min(s.name), min(c.name), count(distinct s.oid)
       from my_tags s
       join my_tags c on c.oid = s.oid and c.category = 'character'
      where s.category = 'series'
      group by s.k, c.k
      order by count(distinct s.oid) desc, s.k, c.k
      limit 4)
    union all
    -- 目標（持っている数が 0 になっていても出す）
    select g.kind,
           case when g.kind in ('series', 'series_character') then 'series' else 'character' end,
           lower(btrim(case when g.kind in ('series', 'series_character') then g.series else g."character" end)),
           case g.kind when 'character_type' then 'type' when 'series_character' then 'character' end,
           lower(btrim(case g.kind when 'character_type' then g.type when 'series_character' then g."character" end)),
           btrim(case when g.kind in ('series', 'series_character') then g.series else g."character" end),
           btrim(case g.kind when 'character_type' then g.type when 'series_character' then g."character" end),
           -1
      from public.collection_goals g
     where g.user_id = target
       and target = auth.uid()
  ),
  dedup as materialized (
    -- 自動の候補と目標が重なったら1つに（名前は持っているグッズのタグ名を優先）
    select row_number() over () as rid, x.*
      from (
        select distinct on (c.kd, c.k1, coalesce(c.k2, '')) c.*
          from cand c
         order by c.kd, c.k1, coalesce(c.k2, ''), c.score desc
      ) x
  ),
  mem as materialized (
    -- 的ごとの公式グッズ（1つの的につき1回だけ引く）
    select d.rid, x.oid
      from dedup d
      cross join lateral public.collection_target_members(d.c1, d.k1, d.c2, d.k2) as x(oid)
  ),
  agg as (
    select d.rid,
           count(mm.oid)::integer as total_n,
           count(m.oid)::integer as owned_n,
           (array_agg(m.img order by m.created_at desc) filter (where m.img is not null))[1] as cover
      from dedup d
      left join mem mm on mm.rid = d.rid
      left join my m on m.oid = mm.oid
     group by d.rid
  )
  select d.kd,
         null::text,
         case when d.c1 = 'series' then d.n1 end,
         case when d.c1 = 'character' then d.n1 when d.c2 = 'character' then d.n2 end,
         case when d.c2 = 'type' then d.n2 end,
         a.owned_n,
         greatest(a.total_n, a.owned_n),
         a.cover,
         ms.items
    from dedup d
    join agg a on a.rid = d.rid
    left join lateral (
      -- あと1〜2個で、分母も小さいときだけ、足りないグッズを返す（多いと重く、画面にも出しきれない）
      select jsonb_agg(jsonb_build_object('id', oi.id, 'title', oi.title, 'image', oi.image)
                       order by oi.release_date desc nulls last, oi.id) as items
        from mem mm
        join public.official_items oi on oi.id = mm.oid
       where mm.rid = d.rid
         and a.total_n - a.owned_n between 1 and 2
         and a.total_n <= 60
         and not exists (select 1 from my m where m.oid = mm.oid)
    ) ms on true
   where a.total_n > 0 or d.score = -1;
end;
$function$;

grant execute on function public.get_collection_targets(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- はじめてガイドの「集めるもの」（goal）: 目標を1つ以上決めた
-- ---------------------------------------------------------------------------
insert into public.onboarding_reward_steps (step_id, points, is_active)
values ('goal', 10, true)
on conflict (step_id) do update set is_active = true;

create or replace function public.onboarding_step_done(_uid uuid, _step_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case _step_id
    when 'account' then true
    when 'interests' then exists (
      select 1 from public.profiles p
      where p.id = _uid and coalesce(array_length(p.interests, 1), 0) > 0
    )
    when 'goal' then exists (select 1 from public.collection_goals g where g.user_id = _uid)
    when 'profile' then exists (
      select 1 from public.profiles p
      where p.id = _uid
        and (coalesce(p.avatar_url, '') <> '' or coalesce(p.bio, '') <> ''
             or (coalesce(p.display_name, '') <> '' and p.display_name is distinct from p.username))
    )
    when 'first-item' then exists (select 1 from public.user_items where user_id = _uid)
    when 'favorites' then (
      select coalesce(array_length(p.favorite_item_ids, 1), 0) >= greatest(1, least(5, (select count(*) from public.user_items u where u.user_id = _uid)))
      from public.profiles p where p.id = _uid
    )
    when 'wishlist' then exists (select 1 from public.wishlists where user_id = _uid)
    when 'ai-room' then exists (select 1 from public.ai_generated_rooms where user_id = _uid)
    when 'avatar' then exists (
      select 1 from public.avatar_gallery
      where user_id = _uid and coalesce(prompt, '') not in ('プロフィール画像', 'アップロード画像')
    )
    when 'follow' then exists (select 1 from public.follows where follower_id = _uid)
    when 'trade-offer' then exists (select 1 from public.user_items where user_id = _uid and for_trade)
    when 'bookmark' then exists (select 1 from public.ai_work_bookmarks where user_id = _uid)
    else false
  end;
$$;

revoke all on function public.onboarding_step_done(uuid, text) from public, anon, authenticated;
