-- カタログの重い集計を、ゲスト（anon・statement_timeout 3 秒）が開くたびに走らせないようにする。
--
-- 【なぜ】（計測は本番 2026-10-27、DB は CPU の少ない小さなインスタンス）
--  - 広告から /try で来たゲストが開くカタログで、次の RPC が毎回 item_tags（約 20 万行）を集計していた。
--      catalog_tag_counts('ちいかわ') 3.4 秒 / catalog_tag_counts(null) 1.8 秒 / get_character_completion 0.9〜3 秒 /
--      get_catalog_completion 0.4 秒 / catalog_content_counts 0.25 秒 / catalog_content_covers 0.1 秒
--    単体でも 3 秒を超えるものがあり、混んでいると一覧そのもの（単体なら 40ms）まで 57014（時間切れ）になっていた。
--  - サムネ作りの cron（catalog-thumbs-recent / catalog-thumbs-retry）と claim_catalog_image_thumbs が、
--    「サムネの無い画像があるか」を official_items 全件（約 5.8 万件）の md5(image) で毎回探していた
--    （cron 1 回 4.8 秒 × 10 分ごと × 2 本、claim 1 回 0.76 秒 × 数千回）。
--
-- 【どうする】
--  a) 集計を 10 分ごとに作り置きする（refresh_catalog_caches()。pg_cron で 10 分ごと、このマイグレーションの最後にも 1 回）。
--     画面から呼ばれる関数は、作り置きを読むだけにする（名前・引数・返す列・数え方は変えない）。
--     - 本人の所持数（owned）は、作り置きでなく本人の user_items（多くて数千件）から数える。ゲストは user_items を読まずに 0。
--     - 作り置きがまだ無い（初回の refresh 前）・その作品／キャラ／シリーズの行が無い（作り置きの後に増えた）ときは、
--       これまでどおりその場で数える（何も壊れない。小さい作品・キャラなら軽い）。
--     - 新しく登録したグッズが件数に入るのは、次の作り置き（最大 10 分後）から。
--  b) サムネを作る画像の「待ち行列」catalog_image_thumb_pending を置く。
--     official_items の追加・画像の変更・統合のたびにトリガーで出し入れし、catalog_image_thumbs に行ができたら消す。
--     claim と cron はこの小さな表だけを見る（全件を md5 でなめない）。
--  c) get_collection_progress（ログインユーザーのコンプ進捗、平均 2 秒）のシリーズごとの総数も作り置きを読む。
--
-- 【安全】
--  - official_items の列は足さない・書き換えない（行の書き直し＝長い排他ロックは無し）。
--    official_items と catalog_image_thumbs にトリガーを付けるときに一瞬ロックを取る（読み取りは止めない）。
--    待ち行列の初回の詰め込みと、最初の作り置き（数秒）が終わるまでは、このトランザクションの中で書き込みが待つ。
--  - 何度流しても同じ結果になる（create ... if not exists / create or replace / cron は同じ名前を消してから登録）。
--  - 作り置きの表は誰でも読めるが、書けるのは refresh_catalog_caches()（SECURITY DEFINER）だけ。
--  - cron の中の合言葉は、これまでどおり vault から名前で引く（ここに値は書かない）。
--  - pg_cron が無い環境（手元のテスト）では cron の部分を飛ばす。

-- ===========================================================================
-- a) 作り置きの表
-- ===========================================================================

-- いつ作ったか（1 行だけ）。この行が無い＝まだ一度も作っていない → 各関数はその場で数える
create table if not exists public.catalog_cache_meta (
  id boolean primary key default true check (id),
  refreshed_at timestamptz not null default now(),
  took_ms integer
);

-- タグごとのグッズ数（catalog_tag_counts）。content_name = '' は「すべての作品」
create table if not exists public.catalog_tag_count_cache (
  content_name text not null,
  tag_id uuid not null,
  item_count integer not null,
  primary key (content_name, tag_id)
);

-- 作品ごとのグッズ数（catalog_content_counts）
create table if not exists public.catalog_content_count_cache (
  content_name text primary key,
  item_count integer not null
);

-- 作品ごとの表紙（catalog_content_covers）。新しい順に最大 4 枚（関数の上限と同じ）
create table if not exists public.catalog_content_cover_cache (
  content_name text primary key,
  images text[] not null
);

-- 作品の所持率の総数（get_catalog_completion）。scope = 作品名。kind = work / series / character / type
create table if not exists public.catalog_completion_total_cache (
  scope text not null,
  kind text not null,
  label text not null,
  total integer not null,
  primary key (scope, kind, label)
);

-- キャラの所持率の総数（get_character_completion）。キャラ = 同じ作品（content_id）の同じ名前のキャラタグ。
-- content_key は content_id の文字列（作品の無いキャラタグは ''）。kind = work / series / type
create table if not exists public.catalog_character_total_cache (
  content_key text not null,
  char_name text not null,
  kind text not null,
  label text not null,
  total integer not null,
  primary key (content_key, char_name, kind, label)
);

-- コンプ進捗のシリーズ（作品名・シリーズタグ）ごとの総数（get_collection_progress）。key = lower(btrim(名前))
create table if not exists public.catalog_series_total_cache (
  key text primary key,
  label text not null,
  total integer not null
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'catalog_cache_meta', 'catalog_tag_count_cache', 'catalog_content_count_cache', 'catalog_content_cover_cache',
    'catalog_completion_total_cache', 'catalog_character_total_cache', 'catalog_series_total_cache'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    -- 読み取りだけ。書き込みのポリシーは作らない（refresh_catalog_caches が所有者として書く）
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = 'catalog cache is public') then
      execute format('create policy "catalog cache is public" on public.%I for select to anon, authenticated using (true)', tbl);
    end if;
    execute format('revoke all on public.%I from public, anon, authenticated', tbl);
    execute format('grant select on public.%I to anon, authenticated', tbl);
  end loop;
end;
$$;

-- ===========================================================================
-- a) 作り置きを作り直す
-- ===========================================================================
-- 1 回の呼び出し（= 1 トランザクション）の中で、変わった行だけを入れ替える。
-- 読む側は MVCC で、終わるまで前の内容をそのまま見る（途中の半端な状態は見えない）。TRUNCATE は使わない（読む側を止めるため）。
-- 同時に 2 つ走ったら、後のほうは何もしないで帰る。
create or replace function public.refresh_catalog_caches()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t0 timestamptz := clock_timestamp();
begin
  -- 呼び出し元（cron・SQL エディタ）の時間切れに巻き込まれないように。全件の集計で数秒かかる
  set local statement_timeout = '120s';
  if not pg_try_advisory_xact_lock(hashtext('refresh_catalog_caches')) then
    return;
  end if;

  -- 統合されていないグッズ（get_collection_progress は exclude_from_lists を見ないので、両方を持っておく）
  drop table if exists pg_temp._cc_items;
  create temp table _cc_items on commit drop as
    select o.id, o.content_name, (o.exclude_from_lists is not true) as listed
      from public.official_items o
     where o.merged_into is null;

  drop table if exists pg_temp._cc_tags;
  create temp table _cc_tags on commit drop as
    select i.id, i.content_name, i.listed, it.tag_id, t.category, t.name
      from _cc_items i
      join public.item_tags it on it.official_item_id = i.id
      join public.tags t on t.id = it.tag_id;
  analyze _cc_items;
  analyze _cc_tags;

  -- ── タグごとのグッズ数（一覧と同じ母数: 統合済み・一覧から外したものは数えない）──
  drop table if exists pg_temp._cc_new_tag;
  create temp table _cc_new_tag on commit drop as
    select g.content_name, g.tag_id, count(*)::integer as item_count
      from _cc_tags g
     where g.listed and g.content_name is not null and g.content_name <> ''
     group by g.content_name, g.tag_id
    union all
    select '', g.tag_id, count(*)::integer
      from _cc_tags g
     where g.listed
     group by g.tag_id;

  delete from public.catalog_tag_count_cache c
   where not exists (select 1 from _cc_new_tag n where n.content_name = c.content_name and n.tag_id = c.tag_id);
  insert into public.catalog_tag_count_cache as c (content_name, tag_id, item_count)
  select n.content_name, n.tag_id, n.item_count from _cc_new_tag n
  on conflict (content_name, tag_id) do update set item_count = excluded.item_count
   where c.item_count is distinct from excluded.item_count;

  -- ── 作品ごとのグッズ数 ──
  drop table if exists pg_temp._cc_new_content;
  create temp table _cc_new_content on commit drop as
    select i.content_name, count(*)::integer as item_count
      from _cc_items i
     where i.listed and i.content_name is not null and i.content_name <> ''
     group by i.content_name;

  delete from public.catalog_content_count_cache c
   where not exists (select 1 from _cc_new_content n where n.content_name = c.content_name);
  insert into public.catalog_content_count_cache as c (content_name, item_count)
  select n.content_name, n.item_count from _cc_new_content n
  on conflict (content_name) do update set item_count = excluded.item_count
   where c.item_count is distinct from excluded.item_count;

  -- ── 作品ごとの表紙（catalog_content_covers の本体と同じ選び方で、上限の 4 枚まで）──
  drop table if exists pg_temp._cc_new_cover;
  create temp table _cc_new_cover on commit drop as
    select distinct on (c.name) c.name as content_name, p.images
      from public.content_names c
      cross join lateral (
        select array_agg(r.image order by r.newest desc) as images
          from (
            select recent.image, max(recent.release_date) as newest
              from (
                select o.image, o.release_date
                  from public.official_items o
                 where o.content_name = c.name
                   and o.merged_into is null
                   and o.exclude_from_lists is not true
                   and o.release_date is not null
                   and o.image is not null and o.image <> '' and o.image <> '/placeholder.svg'
                 order by o.release_date desc
                 limit 12
              ) recent
             group by recent.image
             order by newest desc
             limit 4
          ) r
      ) p
     where p.images is not null;

  delete from public.catalog_content_cover_cache c
   where not exists (select 1 from _cc_new_cover n where n.content_name = c.content_name);
  insert into public.catalog_content_cover_cache as c (content_name, images)
  select n.content_name, n.images from _cc_new_cover n
  on conflict (content_name) do update set images = excluded.images
   where c.images is distinct from excluded.images;

  -- ── 作品の所持率の総数（get_catalog_completion と同じ数え方。同じ名前のタグはまとめ、1 つのグッズは 1 回）──
  drop table if exists pg_temp._cc_new_completion;
  create temp table _cc_new_completion on commit drop as
    select i.content_name as scope, 'work'::text as kind, i.content_name as label, count(*)::integer as total
      from _cc_items i
     where i.listed and i.content_name is not null and i.content_name <> ''
     group by i.content_name
    union all
    select g.content_name, g.category, btrim(g.name), count(distinct g.id)::integer
      from _cc_tags g
     where g.listed and g.content_name is not null and g.content_name <> ''
       and g.category in ('series', 'character', 'type')
       and g.name is not null and btrim(g.name) not in ('', 'なし')
     group by g.content_name, g.category, btrim(g.name);

  delete from public.catalog_completion_total_cache c
   where not exists (
     select 1 from _cc_new_completion n where n.scope = c.scope and n.kind = c.kind and n.label = c.label
   );
  insert into public.catalog_completion_total_cache as c (scope, kind, label, total)
  select n.scope, n.kind, n.label, n.total from _cc_new_completion n
  on conflict (scope, kind, label) do update set total = excluded.total
   where c.total is distinct from excluded.total;

  -- ── キャラの所持率の総数（get_character_completion と同じ数え方）──
  drop table if exists pg_temp._cc_char_items;
  create temp table _cc_char_items on commit drop as
    select distinct coalesce(t.content_id::text, '') as content_key, t.name as char_name, g.id
      from _cc_tags g
      join public.tags t on t.id = g.tag_id
     where g.listed and g.category = 'character' and g.name is not null;
  analyze _cc_char_items;

  drop table if exists pg_temp._cc_new_char;
  create temp table _cc_new_char on commit drop as
    select ci.content_key, ci.char_name, 'work'::text as kind, ci.char_name as label, count(*)::integer as total
      from _cc_char_items ci
     group by ci.content_key, ci.char_name
    union all
    select ci.content_key, ci.char_name, g.category, btrim(g.name), count(distinct ci.id)::integer
      from _cc_char_items ci
      join _cc_tags g on g.id = ci.id
     where g.category in ('series', 'type')
       and g.name is not null and btrim(g.name) not in ('', 'なし')
     group by ci.content_key, ci.char_name, g.category, btrim(g.name);

  delete from public.catalog_character_total_cache c
   where not exists (
     select 1 from _cc_new_char n
      where n.content_key = c.content_key and n.char_name = c.char_name and n.kind = c.kind and n.label = c.label
   );
  insert into public.catalog_character_total_cache as c (content_key, char_name, kind, label, total)
  select n.content_key, n.char_name, n.kind, n.label, n.total from _cc_new_char n
  on conflict (content_key, char_name, kind, label) do update set total = excluded.total
   where c.total is distinct from excluded.total;

  -- ── コンプ進捗のシリーズごとの総数（get_collection_progress と同じ: 統合済みだけ除く・作品名とシリーズタグ・ラベルは min）──
  drop table if exists pg_temp._cc_new_series;
  create temp table _cc_new_series on commit drop as
    select x.key, min(x.label) as label, count(distinct x.id)::integer as total
      from (
        select i.id, btrim(i.content_name) as label, lower(btrim(i.content_name)) as key
          from _cc_items i
         where i.content_name is not null
        union all
        select g.id, btrim(g.name), lower(btrim(g.name))
          from _cc_tags g
         where g.category = 'series' and g.name is not null
      ) x
     where x.key not in ('', 'なし')
     group by x.key;

  delete from public.catalog_series_total_cache c
   where not exists (select 1 from _cc_new_series n where n.key = c.key);
  insert into public.catalog_series_total_cache as c (key, label, total)
  select n.key, n.label, n.total from _cc_new_series n
  on conflict (key) do update set label = excluded.label, total = excluded.total
   where c.label is distinct from excluded.label or c.total is distinct from excluded.total;

  insert into public.catalog_cache_meta as m (id, refreshed_at, took_ms)
  values (true, now(), (extract(epoch from clock_timestamp() - t0) * 1000)::integer)
  on conflict (id) do update set refreshed_at = excluded.refreshed_at, took_ms = excluded.took_ms;
end;
$$;

comment on function public.refresh_catalog_caches() is
  'カタログの集計の作り置き（タグ数・作品数・表紙・所持率の総数・コンプ進捗の総数）を作り直す。pg_cron で 10 分ごと。変わった行だけ入れ替える。';

revoke all on function public.refresh_catalog_caches() from public, anon, authenticated;

-- ===========================================================================
-- a) 画面から呼ばれる関数を、作り置きを読むように置き換える
-- ===========================================================================

-- タグごとのグッズ数。作り置きが無い・その作品の行が無いときはその場で数える（前の定義と同じ）。
-- _content_name = '' は作り置きの「すべて」と重なるので、その場で数える。
create or replace function public.catalog_tag_counts(_content_name text default null)
returns table(
  id uuid,
  name text,
  category text,
  content_id uuid,
  created_at timestamptz,
  item_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
begin
  if _content_name is distinct from ''
     and exists (select 1 from public.catalog_cache_meta)
     and exists (select 1 from public.catalog_tag_count_cache c where c.content_name = coalesce(_content_name, '')) then
    return query
      select t.id, t.name, t.category, t.content_id, t.created_at, c.item_count::bigint
        from public.catalog_tag_count_cache c
        join public.tags t on t.id = c.tag_id
       where c.content_name = coalesce(_content_name, '')
       order by c.item_count desc, t.name, t.id;
    return;
  end if;

  return query
    select t.id, t.name, t.category, t.content_id, t.created_at, count(*)::bigint as item_count
      from public.item_tags it
      join public.official_items o on o.id = it.official_item_id
      join public.tags t on t.id = it.tag_id
     where o.merged_into is null
       and o.exclude_from_lists is not true
       and (_content_name is null or o.content_name = _content_name)
     group by t.id, t.name, t.category, t.content_id, t.created_at
     order by count(*) desc, t.name, t.id;
end;
$$;

revoke all on function public.catalog_tag_counts(text) from public;
grant execute on function public.catalog_tag_counts(text) to anon, authenticated;

-- 作品ごとのグッズ数
create or replace function public.catalog_content_counts()
returns table(content_name text, item_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
begin
  if exists (select 1 from public.catalog_cache_meta) then
    return query
      select c.content_name, c.item_count::bigint
        from public.catalog_content_count_cache c
       order by c.item_count desc, c.content_name;
    return;
  end if;

  return query
    select o.content_name, count(*)::bigint
      from public.official_items o
     where o.merged_into is null and o.exclude_from_lists is not true
       and o.content_name is not null and o.content_name <> ''
     group by o.content_name
     order by count(*) desc, o.content_name;
end;
$$;

grant execute on function public.catalog_content_counts() to anon, authenticated;

-- 作品ごとの表紙。作り置きは新しい順に 4 枚までなので、先頭から per_content 枚（1〜4）を返す
create or replace function public.catalog_content_covers(per_content int default 2)
returns table(content_name text, images text[])
language plpgsql
stable
set search_path to 'public'
as $$
#variable_conflict use_column
begin
  if exists (select 1 from public.catalog_cache_meta) then
    return query
      select c.content_name, c.images[1:least(greatest(per_content, 1), 4)]
        from public.catalog_content_cover_cache c;
    return;
  end if;

  return query
    select c.name, p.images
      from public.content_names c
      cross join lateral (
        select array_agg(r.image order by r.newest desc) as images
          from (
            select recent.image, max(recent.release_date) as newest
              from (
                select o.image, o.release_date
                  from public.official_items o
                 where o.content_name = c.name
                   and o.merged_into is null
                   and o.exclude_from_lists is not true
                   and o.release_date is not null
                   and o.image is not null and o.image <> '' and o.image <> '/placeholder.svg'
                 order by o.release_date desc
                 limit 12
              ) recent
             group by recent.image
             order by newest desc
             limit least(greatest(per_content, 1), 4)
          ) r
      ) p
     where p.images is not null;
end;
$$;

grant execute on function public.catalog_content_covers(int) to anon, authenticated;

-- 作品の所持率。総数は作り置き、owned は本人の user_items から（持っている数だけ読む）。ゲストは 0。
-- 作り置きの後にグッズが増えて owned が総数を超えるときは、総数でおさえる（100% を超えない）。
create or replace function public.get_catalog_completion(_content text)
returns table(kind text, label text, owned integer, total integer)
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
begin
  if not exists (select 1 from public.catalog_cache_meta)
     or not exists (select 1 from public.catalog_completion_total_cache c where c.scope = _content) then
    -- 作り置きが無い（初回前・作り置きの後にできた作品）: これまでどおりその場で数える
    return query
      with items as materialized (
        select oi.id
          from public.official_items oi
         where oi.content_name = _content
           and oi.merged_into is null
           and oi.exclude_from_lists is not true
           and oi.content_name is not null
           and oi.content_name <> ''
      ),
      mine as materialized (
        select distinct ui.official_item_id as id
          from public.user_items ui
         where ui.user_id = uid
           and ui.official_item_id is not null
      ),
      flagged as materialized (
        select i.id, (m.id is not null) as is_owned
          from items i
          left join mine m on m.id = i.id
      ),
      tagged as (
        select distinct f.id, f.is_owned, t.category, btrim(t.name) as name
          from flagged f
          join public.item_tags it on it.official_item_id = f.id
          join public.tags t on t.id = it.tag_id
         where t.category in ('series', 'character', 'type')
           and t.name is not null
           and btrim(t.name) not in ('', 'なし')
      )
      select 'work'::text, _content, (count(*) filter (where f.is_owned))::integer, count(*)::integer
        from flagged f
      union all
      select g.category::text, g.name, (count(*) filter (where g.is_owned))::integer, count(*)::integer
        from tagged g
       group by g.category, g.name;
    return;
  end if;

  if uid is null then
    -- ゲストは user_items を読まない
    return query
      select c.kind, c.label, 0, c.total
        from public.catalog_completion_total_cache c
       where c.scope = _content;
    return;
  end if;

  return query
    with mine as materialized (
      -- 本人の所持のうち、この作品の一覧に出るグッズ（idx_user_items_user_official → 主キー）
      select distinct ui.official_item_id as id
        from public.user_items ui
        join public.official_items oi on oi.id = ui.official_item_id
       where ui.user_id = uid
         and ui.official_item_id is not null
         and oi.content_name = _content
         and oi.merged_into is null
         and oi.exclude_from_lists is not true
    ),
    owned as (
      select 'work'::text as kind, _content as label, count(*)::integer as n
        from mine
      union all
      select g.category, g.name, count(*)::integer
        from (
          select distinct m.id, t.category, btrim(t.name) as name
            from mine m
            join public.item_tags it on it.official_item_id = m.id
            join public.tags t on t.id = it.tag_id
           where t.category in ('series', 'character', 'type')
             and t.name is not null
             and btrim(t.name) not in ('', 'なし')
        ) g
       group by g.category, g.name
    )
    select c.kind, c.label, least(coalesce(o.n, 0), c.total), c.total
      from public.catalog_completion_total_cache c
      left join owned o on o.kind = c.kind and o.label = c.label
     where c.scope = _content;
end;
$function$;

comment on function public.get_catalog_completion(text) is
  '作品のカタログ所持率。work 1 行と series/character/type の内訳。総数は作り置き（10 分ごと）、owned は auth.uid() の所持（ゲストは 0）。merged_into・exclude_from_lists は除く。';

revoke all on function public.get_catalog_completion(text) from public;
grant execute on function public.get_catalog_completion(text) to anon, authenticated;

-- キャラの所持率。総数は作り置き、owned は本人の user_items から。ゲストは 0。
create or replace function public.get_character_completion(_tag_id uuid)
returns table(kind text, label text, owned integer, total integer)
language plpgsql
stable
security invoker
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  b_name text;
  b_content uuid;
  ckey text;
begin
  select t.name, t.content_id into b_name, b_content
    from public.tags t
   where t.id = _tag_id
     and t.category = 'character';
  -- キャラのタグでない・無い id のときは 1 行も返さない
  if not found then
    return;
  end if;
  ckey := coalesce(b_content::text, '');

  if b_name is null
     or not exists (select 1 from public.catalog_cache_meta)
     or not exists (
       select 1 from public.catalog_character_total_cache c where c.content_key = ckey and c.char_name = b_name
     ) then
    -- 作り置きが無い（初回前・作り置きの後にできたキャラ・グッズが 0 件のキャラ）: これまでどおりその場で数える
    return query
      with char_tags as materialized (
        select t.id
          from public.tags t
         where t.category = 'character'
           and t.name = b_name
           and t.content_id is not distinct from b_content
      ),
      items as materialized (
        select distinct it.official_item_id as id
          from public.item_tags it
          join public.official_items oi on oi.id = it.official_item_id
         where it.tag_id in (select id from char_tags)
           and oi.merged_into is null
           and oi.exclude_from_lists is not true
      ),
      mine as materialized (
        select distinct ui.official_item_id as id
          from public.user_items ui
         where ui.user_id = uid
           and ui.official_item_id is not null
      ),
      flagged as materialized (
        select i.id, (m.id is not null) as is_owned
          from items i
          left join mine m on m.id = i.id
      ),
      tagged as (
        select distinct f.id, f.is_owned, t.category, btrim(t.name) as name
          from flagged f
          join public.item_tags it on it.official_item_id = f.id
          join public.tags t on t.id = it.tag_id
         where t.category in ('series', 'type')
           and t.name is not null
           and btrim(t.name) not in ('', 'なし')
      )
      select 'work'::text, b_name, (count(*) filter (where f.is_owned))::integer, count(*)::integer
        from flagged f
      union all
      select g.category::text, g.name, (count(*) filter (where g.is_owned))::integer, count(*)::integer
        from tagged g
       group by g.category, g.name;
    return;
  end if;

  if uid is null then
    return query
      select c.kind, c.label, 0, c.total
        from public.catalog_character_total_cache c
       where c.content_key = ckey and c.char_name = b_name;
    return;
  end if;

  return query
    with char_tags as materialized (
      select t.id
        from public.tags t
       where t.category = 'character'
         and t.name = b_name
         and t.content_id is not distinct from b_content
    ),
    mine as materialized (
      -- 本人の所持のうち、このキャラのタグが付いた一覧に出るグッズ
      select distinct ui.official_item_id as id
        from public.user_items ui
        join public.official_items oi on oi.id = ui.official_item_id
       where ui.user_id = uid
         and ui.official_item_id is not null
         and oi.merged_into is null
         and oi.exclude_from_lists is not true
         and exists (
           select 1 from public.item_tags it
            where it.official_item_id = ui.official_item_id
              and it.tag_id in (select id from char_tags)
         )
    ),
    owned as (
      select 'work'::text as kind, b_name as label, count(*)::integer as n
        from mine
      union all
      select g.category, g.name, count(*)::integer
        from (
          select distinct m.id, t.category, btrim(t.name) as name
            from mine m
            join public.item_tags it on it.official_item_id = m.id
            join public.tags t on t.id = it.tag_id
           where t.category in ('series', 'type')
             and t.name is not null
             and btrim(t.name) not in ('', 'なし')
        ) g
       group by g.category, g.name
    )
    select c.kind, c.label, least(coalesce(o.n, 0), c.total), c.total
      from public.catalog_character_total_cache c
      left join owned o on o.kind = c.kind and o.label = c.label
     where c.content_key = ckey and c.char_name = b_name;
end;
$function$;

comment on function public.get_character_completion(uuid) is
  'キャラページの所持率。work 1 行（キャラ全体）と series/type の内訳。同じ作品の同名キャラタグはまとめる。総数は作り置き（10 分ごと）、owned は auth.uid() の所持（ゲストは 0）。merged_into・exclude_from_lists は除く。';

revoke all on function public.get_character_completion(uuid) from public;
grant execute on function public.get_character_completion(uuid) to anon, authenticated;

-- ===========================================================================
-- c) get_collection_progress: シリーズごとの総数を作り置きから読む
-- ===========================================================================
-- 直近の定義（20261026120000_speed_up_progress_and_trade_partners.sql）と同じ。totals だけ、
-- 作り置きにある key はそれを使い、無い key（初回前・作り置きの後にできたシリーズ）だけ前と同じくその場で数える。
-- 本人の所持（my / my_series / mine）は前のまま。SECURITY DEFINER・can_view_collection の判定も前のまま。
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
    -- 作り置き（10 分ごと）
    select k.key, c.label, c.total
      from keys k
      join public.catalog_series_total_cache c on c.key = k.key
    union all
    -- 作り置きに無い key だけ、1 つずつ索引で数える（前と同じ）
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
     where not exists (select 1 from public.catalog_series_total_cache c2 where c2.key = k.key)
       and c.total > 0
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

-- ===========================================================================
-- b) サムネを作る画像の待ち行列
-- ===========================================================================
-- 1 つの元URLにつき 1 行。「統合されていないグッズが使っていて、まだ catalog_image_thumbs に行が無い」画像だけが入る。
-- created_at はその画像を使うグッズの登録日時（いちばん新しいもの）。claim の並び順と recentOnly（2 時間以内）に使う。
create table if not exists public.catalog_image_thumb_pending (
  src_hash text primary key,
  src_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists catalog_image_thumb_pending_created_idx
  on public.catalog_image_thumb_pending (created_at desc);

-- 関数（service_role）と cron だけが使う。画面からは触らない
alter table public.catalog_image_thumb_pending enable row level security;
revoke all on public.catalog_image_thumb_pending from public, anon, authenticated;

-- official_items の追加・画像の変更・統合・削除で、待ち行列を出し入れする
create or replace function public.catalog_thumb_pending_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 前の画像: もう誰も（統合されていないグッズが）使っていなければ外す
  if tg_op in ('UPDATE', 'DELETE')
     and old.image like 'https://%' and old.image not like '%/storage/v1/%'
     and (tg_op = 'DELETE' or new.image is distinct from old.image or new.merged_into is not null) then
    if not exists (
      -- official_items_image_base_idx（split_part(image, '?', 1)）で引く
      select 1 from public.official_items o
       where split_part(o.image, '?', 1) = split_part(old.image, '?', 1)
         and o.image = old.image
         and o.merged_into is null
         and o.id <> old.id
    ) then
      delete from public.catalog_image_thumb_pending p where p.src_hash = md5(old.image);
    end if;
  end if;

  -- 今の画像: サムネの対象で、まだ catalog_image_thumbs に行が無ければ入れる
  if tg_op in ('INSERT', 'UPDATE')
     and new.merged_into is null
     and new.image like 'https://%' and new.image not like '%/storage/v1/%'
     and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = md5(new.image)) then
    insert into public.catalog_image_thumb_pending as p (src_hash, src_url, created_at)
    values (md5(new.image), new.image, coalesce(new.created_at, now()))
    on conflict (src_hash) do update set created_at = greatest(p.created_at, excluded.created_at)
     where p.created_at < excluded.created_at;
  end if;
  return null;
end;
$$;

revoke all on function public.catalog_thumb_pending_sync() from public, anon, authenticated;

drop trigger if exists catalog_thumb_pending_sync on public.official_items;
create trigger catalog_thumb_pending_sync
  after insert or update of image, merged_into or delete on public.official_items
  for each row execute function public.catalog_thumb_pending_sync();

-- catalog_image_thumbs に行ができた（claim が取った）ら待ち行列から外す。
-- 行が消された（作り直すために手で消した）ら、まだ使われている画像なら待ち行列に戻す。
create or replace function public.catalog_thumb_pending_prune()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    delete from public.catalog_image_thumb_pending p where p.src_hash = new.src_hash;
  elsif tg_op = 'DELETE' then
    insert into public.catalog_image_thumb_pending (src_hash, src_url, created_at)
    select md5(o.image), o.image, max(o.created_at)
      from public.official_items o
     where split_part(o.image, '?', 1) = split_part(old.src_url, '?', 1)
       and o.image = old.src_url
       and md5(o.image) = old.src_hash
       and o.merged_into is null
       and o.image like 'https://%' and o.image not like '%/storage/v1/%'
     group by o.image
    on conflict (src_hash) do nothing;
  end if;
  return null;
end;
$$;

revoke all on function public.catalog_thumb_pending_prune() from public, anon, authenticated;

drop trigger if exists catalog_thumb_pending_prune on public.catalog_image_thumbs;
create trigger catalog_thumb_pending_prune
  after insert or delete on public.catalog_image_thumbs
  for each row execute function public.catalog_thumb_pending_prune();

-- 今ある分を 1 回だけ詰める（トリガーを付けた後なので、この間に増えた分も漏れない。何度流しても同じ）
insert into public.catalog_image_thumb_pending (src_hash, src_url, created_at)
select md5(o.image), o.image, max(o.created_at)
  from public.official_items o
 where o.merged_into is null
   and o.image like 'https://%'
   and o.image not like '%/storage/v1/%'
   and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = md5(o.image))
 group by o.image
on conflict (src_hash) do nothing;

-- claim: fresh を待ち行列から選ぶ。ほかは直近の定義（20261011710000_catalog_thumbs_retry_cap.sql）と同じ
-- （advisory lock・止まった取得の 1 件ずつのやり直し・3 回まで・返す列・on conflict の条件）。
create or replace function public.claim_catalog_image_thumbs(
  p_limit int default 10,
  p_recent_only boolean default false
)
returns table (src_hash text, src_url text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 100);
begin
  -- 並列に呼ばれたとき、全員が同じ「次の N 件」を選んで取り合い、1人以外が 0 件になる。
  -- 取る処理だけを順番にして、後の呼び出しには前の呼び出しが取った残りから選ばせる。
  perform pg_advisory_xact_lock(hashtext('claim_catalog_image_thumbs'));

  -- 3回取っても作り終わらなかった（関数ごと CPU・メモリの上限で落ちた）画像は、もう取らない。
  update public.catalog_image_thumbs t
     set status = 'failed', updated_at = now()
   where t.status = 'processing'
     and t.claimed_at < now() - interval '15 minutes'
     and t.attempts >= 3;

  return query
  with stalled as (
    -- 途中で止まった取得（15分以上前）は1件ずつやり直す。
    -- 重すぎて関数ごと落ちる画像が混ざると、同じ回の他の画像まで巻き添えで止まるため
    select t.src_hash, t.src_url
      from public.catalog_image_thumbs t
     where t.status = 'processing' and t.claimed_at < now() - interval '15 minutes' and t.attempts < 3
     order by t.updated_at
     limit 1
  ),
  retry as (
    -- 一時的な失敗（6時間以上前・3回まで）をやり直す
    select * from stalled
    union all
    select t.src_hash, t.src_url
      from public.catalog_image_thumbs t
     where t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours'
       and not exists (select 1 from stalled)
     order by 1
     limit v_limit
  ),
  fresh as (
    -- まだサムネの無い画像（待ち行列）。新しいグッズほどよく見られるので先に作る（created_at の索引で先頭から読める）
    select p.src_hash, p.src_url
      from public.catalog_image_thumb_pending p
     where (not p_recent_only or p.created_at > now() - interval '2 hours')
       -- 念のため（トリガーで外れているはず）
       and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = p.src_hash)
     order by p.created_at desc
     limit v_limit
  ),
  picked as (
    select * from retry
    union
    -- 止まった画像をやり直す回は、その1件だけにする
    select * from fresh where not exists (select 1 from stalled)
    limit v_limit
  )
  insert into public.catalog_image_thumbs as t (src_hash, src_url, status, claimed_at, attempts, updated_at)
  select p.src_hash, p.src_url, 'processing', now(), 1, now()
    from picked p
  on conflict on constraint catalog_image_thumbs_pkey do update
     set status = 'processing',
         claimed_at = now(),
         attempts = t.attempts + 1,
         updated_at = now()
   -- 別の呼び出しが取ったばかりの行や、作り終えた行は横取りしない
   where (t.status = 'processing' and t.claimed_at < now() - interval '15 minutes' and t.attempts < 3)
      or (t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours')
  returning t.src_hash, t.src_url;
end;
$$;

revoke all on function public.claim_catalog_image_thumbs(int, boolean) from public, anon, authenticated;
grant execute on function public.claim_catalog_image_thumbs(int, boolean) to service_role;

-- ===========================================================================
-- cron（pg_cron がある環境だけ）
-- ===========================================================================
-- 1) サムネの cron（catalog-thumbs-recent / catalog-thumbs-retry）:
--    コマンドの「official_items を全件なめて、サムネの無い画像があるか」の exists だけを、待ち行列を見る exists に置き換える。
--    それ以外（URL・合言葉を vault から名前で引く部分・body・本数・失敗のやり直しの条件）と時刻はそのまま
--    （cron.alter_job でコマンドだけ変える）。
--    コマンドの形が想定と違って置き換えられないときは、そのジョブは触らずに NOTICE を出す（重いままだが動きは変わらない）。
--    ただし catalog-thumbs-recent は 20261016060411 で入れた形が分かっているので、その形で作り直す。
-- 2) 作り置きを 10 分ごとに作り直す（サムネの cron と重ならないよう 5 分ずらす）。
do $outer$
declare
  j record;
  pat constant text :=
    'exists\s*\(\s*select\s+1\s+from\s+(?:public\.)?official_items\s+o\s+where\s[^;]*?md5\(\s*o\.image\s*\)\s*\)[^()]*\)';
  new_cmd text;
  replacement text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron がないので cron の登録を飛ばします';
    return;
  end if;

  for j in execute $q$select jobid, jobname, command from cron.job
                       where jobname in ('catalog-thumbs-recent', 'catalog-thumbs-retry')$q$ loop
    if j.command ~* 'catalog_image_thumb_pending' then
      continue; -- もう置き換え済み
    end if;
    -- 2 時間以内だけを見る形（recentOnly）なら、待ち行列も 2 時間以内だけを見る
    replacement := case
      when substring(j.command from pat) ~* 'interval\s+''2 hours''' then
        'exists (select 1 from public.catalog_image_thumb_pending p where p.created_at > now() - interval ''2 hours'')'
      else
        'exists (select 1 from public.catalog_image_thumb_pending p)'
    end;
    new_cmd := regexp_replace(j.command, pat, replacement, 'gi');
    if new_cmd is distinct from j.command and new_cmd !~* 'md5\(\s*o\.image' then
      execute 'select cron.alter_job(job_id := $1, command := $2)' using j.jobid, new_cmd;
      raise notice 'cron % のコマンドを待ち行列を見る形にしました', j.jobname;
    elsif j.jobname = 'catalog-thumbs-recent' then
      -- 想定の形（20261016060411）で作り直す。時刻は今のジョブのまま
      execute 'select cron.alter_job(job_id := $1, command := $2)' using j.jobid, $cmd$
  select net.http_post(
    url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/catalog-thumbs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_thumbs_cron_secret')
    ),
    body := '{"limit": 10, "recentOnly": false}'::jsonb,
    timeout_milliseconds := 150000
  )
  from generate_series(1, 3)
  where exists (select 1 from public.catalog_image_thumb_pending p);
  $cmd$;
      raise notice 'cron catalog-thumbs-recent を作り直しました';
    else
      raise notice 'cron % のコマンドが想定の形ではないので変えていません', j.jobname;
    end if;
  end loop;

  if exists (select 1 from cron.job where jobname = 'refresh-catalog-caches') then
    perform cron.unschedule('refresh-catalog-caches');
  end if;
  perform cron.schedule(
    'refresh-catalog-caches',
    '5,15,25,35,45,55 * * * *',
    'select public.refresh_catalog_caches()'
  );
end;
$outer$;

-- 最初の作り置き（これが終わるまで、各関数はその場で数える）
select public.refresh_catalog_caches();

analyze public.catalog_tag_count_cache;
analyze public.catalog_content_count_cache;
analyze public.catalog_content_cover_cache;
analyze public.catalog_completion_total_cache;
analyze public.catalog_character_total_cache;
analyze public.catalog_series_total_cache;
analyze public.catalog_image_thumb_pending;
