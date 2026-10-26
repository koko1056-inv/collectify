-- 「データの読み込みに失敗しました」が時々出ていた原因（本番 10/26: 時間切れ 8 秒で 500）の対策。
-- ログインユーザーの statement_timeout は 8 秒。マイページ・コレクション・交換を開くと、下の重い RPC が
-- 同時に走り、小さなインスタンスで取り合って 8 秒を超えることがあった（その後の再試行でさらに重くなる）。
--
-- 1) get_collection_progress（コンプ進捗）: 単体でも 4.8 秒。
--    totals で「自分に関係のある作品名」だけを数えるつもりが、planner が keys を 200 件と見積もって
--    official_items（約5.7万件）を全件なめ、全行で lower(btrim(content_name)) を計算していた（約1.8秒）。
--    作品名（key）ごとに LATERAL で引くようにして、official_items_series_key_idx / tags_series_key_idx を必ず使わせる。
--    返す列・並び順・数え方（同じグッズは1回・ラベルは min）は変えない。
-- 2) find_trade_series_partners（同じ作品の交換相手）: 単体で約2秒。
--    全ユーザーの全グッズ × カタログ × タグ を作品名に展開してから絞っていた。
--    自分の作品名は自分のグッズ・ほしいものだけから、相手側は「交換に出している」グッズ（全体でごく少数）だけから作る。
--    結果（相手・作品名・グッズ・並び順・サンプル除外・公開設定・ブロック）は変えない。
-- 3) catalog_content_counts（作品ごとの件数）: 遅いときで 5 秒。
--    クエリの条件そのままの部分索引を作り、索引の並び順で数えられるようにする（関数本体は変えない）。
--
-- SECURITY DEFINER・search_path・実行権限・can_view_collection の判定は元のまま。

-- ---------------------------------------------------------------------------
-- 1. get_collection_progress
-- ---------------------------------------------------------------------------
create or replace function public.get_collection_progress(_user_id uuid default null)
returns table(series_label text, owned integer, total integer, last_added_at timestamptz, cover_image text)
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
  with my as (
    -- 自分の持っているカタログのグッズ（統合済みのものは数えない）
    select ui.official_item_id, ui.created_at, coalesce(ui.image, oi.image) as img, oi.content_name
      from public.user_items ui
      join public.official_items oi on oi.id = ui.official_item_id
     where ui.user_id = target
       and oi.merged_into is null
  ),
  my_series as (
    -- 作品名（content_name）とシリーズタグの両方を「シリーズ」とみなす（official_item_series と同じ考え方）
    select m.official_item_id, btrim(m.content_name) as label, lower(btrim(m.content_name)) as key, m.created_at, m.img
      from my m
     where m.content_name is not null and btrim(m.content_name) not in ('', 'なし')
    union
    select m.official_item_id, btrim(t.name), lower(btrim(t.name)), m.created_at, m.img
      from my m
      join public.item_tags it on it.official_item_id = m.official_item_id
      join public.tags t on t.id = it.tag_id and t.category = 'series'
     where t.name is not null and btrim(t.name) not in ('', 'なし')
  ),
  keys as materialized (
    select distinct ms.key from my_series ms
  ),
  totals as (
    -- 自分に関係のあるシリーズだけ、1つずつ索引で数える（in (select ...) だと全件なめになることがあった）
    select k.key, c.label, c.total
      from keys k
      cross join lateral (
        select min(x.label) as label, count(distinct x.id)::integer as total
          from (
            select oi.id, btrim(oi.content_name) as label
              from public.official_items oi
             where lower(btrim(oi.content_name)) = k.key
               and oi.merged_into is null
            union all
            select oi.id, btrim(t.name)
              from public.tags t
              join public.item_tags it on it.tag_id = t.id
              join public.official_items oi on oi.id = it.official_item_id and oi.merged_into is null
             where t.category = 'series'
               and lower(btrim(t.name)) = k.key
          ) x
      ) c
     where c.total > 0
  ),
  mine as (
    select ms.key,
           count(distinct ms.official_item_id)::integer as owned,
           max(ms.created_at) as last_added_at,
           (array_agg(ms.img order by ms.created_at desc) filter (where ms.img is not null))[1] as cover_image
      from my_series ms
     group by ms.key
  )
  select t.label, m.owned, greatest(t.total, m.owned), m.last_added_at, m.cover_image
    from mine m
    join totals t on t.key = m.key
   order by m.owned desc, t.total desc, t.label;
end;
$function$;

revoke all on function public.get_collection_progress(uuid) from public, anon;
grant execute on function public.get_collection_progress(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. find_trade_series_partners
-- ---------------------------------------------------------------------------
create or replace function public.find_trade_series_partners(_limit integer default 20)
returns table(partner_id uuid, partner_username text, partner_avatar_url text, partner_is_sample boolean, shared_series text[], their_items jsonb)
language sql
stable security definer
set search_path to 'public'
as $function$
  with hidden as (
    select b.blocked_id as uid from public.user_blocks b where b.blocker_id = auth.uid()
    union
    select b.blocker_id as uid from public.user_blocks b where b.blocked_id = auth.uid()
  ),
  -- 自分のグッズ（交換に出しているかは問わない）
  my_items as (
    select ui.content_name, ui.official_item_id
    from public.user_items ui
    where ui.user_id = auth.uid()
  ),
  -- 相手が交換に出しているグッズだけ（全体でごく少数）。ブロック関係はここで除く
  trade_items as (
    select ui.user_id, ui.id, ui.title, ui.image, ui.content_name, ui.official_item_id
    from public.user_items ui
    where ui.for_trade
      and ui.user_id <> auth.uid()
      and ui.user_id not in (select h.uid from hidden h)
  ),
  my_series as (
    select lower(btrim(mi.content_name)) as series_key
    from my_items mi
    where mi.content_name is not null and btrim(mi.content_name) <> ''
    union
    select lower(btrim(oi.content_name))
    from my_items mi
    join public.official_items oi on oi.id = mi.official_item_id
    where oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select lower(btrim(t.name))
    from my_items mi
    join public.item_tags it on it.official_item_id = mi.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where t.name is not null and btrim(t.name) <> ''
    union
    -- ほしいものの作品名
    select lower(btrim(oi.content_name))
    from public.wishlists w
    join public.official_items oi on oi.id = w.official_item_id
    where w.user_id = auth.uid()
      and oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select lower(btrim(t.name))
    from public.wishlists w
    join public.item_tags it on it.official_item_id = w.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where w.user_id = auth.uid()
      and t.name is not null and btrim(t.name) <> ''
  ),
  item_series as (
    select ti.user_id, ti.id as item_id, ti.title, ti.image,
           btrim(ti.content_name) as series_label,
           lower(btrim(ti.content_name)) as series_key
    from trade_items ti
    where ti.content_name is not null and btrim(ti.content_name) <> ''
    union
    select ti.user_id, ti.id, ti.title, ti.image,
           btrim(oi.content_name), lower(btrim(oi.content_name))
    from trade_items ti
    join public.official_items oi on oi.id = ti.official_item_id
    where oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select ti.user_id, ti.id, ti.title, ti.image,
           btrim(t.name), lower(btrim(t.name))
    from trade_items ti
    join public.item_tags it on it.official_item_id = ti.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where t.name is not null and btrim(t.name) <> ''
  ),
  theirs as (
    select distinct s.user_id as pid, s.item_id, s.title, s.image, s.series_label
    from item_series s
    join my_series m on m.series_key = s.series_key
  )
  select
    x.pid,
    pr.username,
    pr.avatar_url,
    pr.is_sample,
    x.series_list,
    x.items
  from (
    select
      t.pid,
      (array_agg(distinct t.series_label))[1:4] as series_list,
      jsonb_agg(distinct jsonb_build_object('id', t.item_id, 'title', t.title, 'image', t.image))
        as items,
      count(distinct t.item_id) as n,
      public.trade_spotlight_user(t.pid) as spot
    from theirs t
    group by t.pid
  ) x
  join public.profiles pr on pr.id = x.pid
  where pr.privacy_level = 'public'
    and not pr.is_sample
  order by x.spot desc, x.n desc, pr.username
  limit greatest(1, least(coalesce(_limit, 20), 50));
$function$;

revoke all on function public.find_trade_series_partners(integer) from public, anon;
grant execute on function public.find_trade_series_partners(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. catalog_content_counts 用の部分索引（関数の WHERE と同じ条件。content_name の並びで数えられる）
-- ---------------------------------------------------------------------------
create index if not exists official_items_listed_content_idx
  on public.official_items (content_name)
  where merged_into is null
    and exclude_from_lists is not true
    and content_name is not null
    and content_name <> '';

analyze public.official_items;
