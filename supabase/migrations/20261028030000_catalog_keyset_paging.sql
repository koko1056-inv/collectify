-- カタログの一覧を「何件目から」（OFFSET）ではなく「この 1 件の次から」（keyset / カーソル）で読む。
--
-- 【なぜ】（計測は本番 2026-10-27、anon、EXPLAIN ANALYZE。ちいかわ = 10,816 件、item_tags(tags) を埋め込み）
--  - 一覧は .range(from, to)（= OFFSET）でページ送りしていて、奥のページほど手前の行を読み捨てる分だけ重い。
--      200 件: OFFSET 0 / 2000 / 6000 = 4.9 / 7.5 / 13.8 ms
--      1000 件:                       24.5 / 26.2 / 40.0 ms
--    CPU の少ない DB が混むと同じ問い合わせが 300〜800 ms になり、ゲスト（statement_timeout 3 秒）が 57014 になることがあった。
--  - 「最後に見た 1 件の (発売日, 登録日, id) より後ろ」を索引から直接読めば、何ページ目でも同じ重さになる。
--
-- 【並び順】画面の並びは今までどおり  release_date desc, created_at desc, id asc（id まで入れて全順序）。
--  - release_date / created_at は NOT NULL（src/integrations/supabase/types.ts の Row が非 null、Insert で release_date は必須、
--    created_at は default now()）。NULL が無いので、PostgREST の desc（= NULLS FIRST）と並びはまったく同じ。
--    もし本番で NULL を許す列になっていたら、カーソルの比較（<, =）が NULL の行を落とすので、下の DO で止める（何も変えずに失敗）。
--
-- 【何を足すか】
--  a) 索引 2 本（並びと同じ向き。統合済み・一覧から外したグッズは入れない部分索引）
--     - official_items_listed_keyset_content_idx  (content_name, release_date desc, created_at desc, id)  … 作品ごとの一覧
--     - official_items_listed_keyset_idx          (release_date desc, created_at desc, id)                … すべての作品の一覧
--     CONCURRENTLY ではない普通の CREATE INDEX（約 5.8 万行で数百 ms〜1 秒ほど）。その間 official_items への書き込み
--     （INSERT/UPDATE/DELETE）は SHARE ロックで待つ。読み取りは止めない。
--  b) catalog_items_after(...)   … 「カーソルの次から p_limit 件」（p_until_* を渡すと「その行まで」で止める）。setof official_items を
--     返すので、PostgREST で .select("..., item_tags(tags(...))") の埋め込みがそのまま使える。
--  c) catalog_page_cursors(...)  … 作品の全件を並列で読むための、ページの境目（N 件ごとの行のキー）と全体の件数を 1 回で返す。
--     索引だけを読む（index only scan）ので、グッズの中身は読まない。
--  d) catalog_listed_total()     … 作品を選ばない一覧の「全 ○ 件」。count=exact（本番で Seq Scan 4.3 秒）の代わりに、
--     作り置きの作品ごとの件数の合計＋作品の無いグッズの件数を返す。
--
-- 【安全】
--  - どの関数も SECURITY INVOKER（RLS がそのまま効く）・STABLE・読むだけ。anon / authenticated に実行を許す。
--  - p_limit は 1〜1000 に丸める（PostgREST の max-rows と同じ上限）。
--  - 何度流しても同じ（create index if not exists / create or replace）。表の書き換え・データの変更は無し。

-- ===========================================================================
-- 0) 前提の確認: 並びに使う列が NOT NULL であること
-- ===========================================================================
do $$
declare
  _nullable text[];
begin
  select array_agg(a.attname::text order by a.attname)
    into _nullable
    from pg_attribute a
   where a.attrelid = 'public.official_items'::regclass
     and a.attname in ('release_date', 'created_at', 'id')
     and not a.attnotnull
     and not a.attisdropped;
  if _nullable is not null then
    raise exception 'catalog_keyset_paging: official_items.% が NULL を許しているので、keyset の比較が NULL の行を落とします（先に NOT NULL にしてください）',
      array_to_string(_nullable, ', ');
  end if;
end;
$$;

-- ===========================================================================
-- a) 並びと同じ向きの部分索引
-- ===========================================================================
create index if not exists official_items_listed_keyset_content_idx
  on public.official_items (content_name, release_date desc, created_at desc, id)
  where merged_into is null and exclude_from_lists = false;

create index if not exists official_items_listed_keyset_idx
  on public.official_items (release_date desc, created_at desc, id)
  where merged_into is null and exclude_from_lists = false;

-- ===========================================================================
-- b) カーソルの次から読む
-- ===========================================================================
-- p_after_* が全部 null なら先頭から。カーソルは「前のページの最後の行」の (release_date, created_at, id)。
-- p_until_* を渡すと、その行（を含む）までで止める（並列で読むときのページの終わり）。
--
-- 「カーソルの次」は、発売日の上限（release_date <= カーソル）を索引の範囲にし、同じ発売日の中の細かい比較だけを絞り込みにする:
--   release_date <= X and (release_date < X or created_at < Y or (created_at = Y and id > Z))
-- 並びが desc, desc, asc と混ざっていて行比較 (a, b, c) < (...) は使えないが、この形なら索引 (content_name,) release_date desc,
-- created_at desc, id の X から先を前から読む Index Scan + Limit になり、並べ直し（Sort）は無い。
-- 絞り込みで読み捨てるのは「カーソルと同じ発売日で、カーソルより前の行」だけ（ページの深さに関係なく、その日の件数まで）。
-- （前は 3 つの範囲に分けて読んでいたが、2 つ目の「同じ発売日で登録日が古い」が Bitmap Scan + Sort になったのでやめた）
create or replace function public.catalog_items_after(
  p_content text default null,
  p_after_release date default null,
  p_after_created timestamptz default null,
  p_after_id uuid default null,
  p_limit integer default 200,
  p_until_release date default null,
  p_until_created timestamptz default null,
  p_until_id uuid default null
)
returns setof public.official_items
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  _limit integer := least(greatest(coalesce(p_limit, 200), 1), 1000);
  _content text := nullif(btrim(p_content), '');
  _from text := 'select o.* from public.official_items o where o.merged_into is null and o.exclude_from_lists = false';
begin
  -- 作品で絞る（$1）。空文字は「すべて」と同じ
  if _content is not null then
    _from := _from || ' and o.content_name = $1';
  end if;

  -- ページの終わり（$6, $7, $8 の行まで）。発売日の下限は索引の範囲になり、同じ発売日の中の細かい比較だけが絞り込みになる
  if p_until_id is not null then
    if p_until_release is null or p_until_created is null then
      raise exception 'catalog_items_after: p_until_* は 3 つそろえて渡してください' using errcode = '22023';
    end if;
    _from := _from || ' and o.release_date >= $6'
                   || ' and (o.release_date > $6 or o.created_at > $7 or (o.created_at = $7 and o.id <= $8))';
  end if;

  -- カーソルの次から
  if p_after_id is not null then
    if p_after_release is null or p_after_created is null then
      raise exception 'catalog_items_after: p_after_* は 3 つそろえて渡してください' using errcode = '22023';
    end if;
    _from := _from || ' and o.release_date <= $2'
                   || ' and (o.release_date < $2 or o.created_at < $3 or (o.created_at = $3 and o.id > $4))';
  end if;

  -- EXECUTE は毎回その値で計画を立てる（作品の有無・カーソルの有無で使う索引が変わるので、使い回しの計画にしない）
  return query execute _from || ' order by o.release_date desc, o.created_at desc, o.id limit $5'
    using _content, p_after_release, p_after_created, p_after_id, _limit, p_until_release, p_until_created, p_until_id;
end;
$$;

comment on function public.catalog_items_after(text, date, timestamptz, uuid, integer, date, timestamptz, uuid) is
  'カタログ一覧の keyset ページ送り。並びは release_date desc, created_at desc, id asc。p_after_* の行の次から p_limit 件（1〜1000）、p_until_* の行まで。';

revoke all on function public.catalog_items_after(text, date, timestamptz, uuid, integer, date, timestamptz, uuid) from public;
grant execute on function public.catalog_items_after(text, date, timestamptz, uuid, integer, date, timestamptz, uuid) to anon, authenticated, service_role;

-- ===========================================================================
-- c) 並列で読むためのページの境目
-- ===========================================================================
-- page_no = 0 の行は必ず 1 行あり（カーソルは null = 先頭から）、total に全体の件数（p_max_rows で打ち切った数）が入る。
-- page_no = k（k ≥ 1）の行は、k × p_page_size 件目の行のキー（= ページ k は「この行の次から」、ページ k-1 は「この行まで」）。
-- 索引の並びのまま row_number を振るので、ソートもグッズの中身の読み込みも無い（index only scan + WindowAgg）。
create or replace function public.catalog_page_cursors(
  p_content text default null,
  p_page_size integer default 1000,
  p_max_rows integer default null
)
returns table(page_no integer, after_release date, after_created timestamptz, after_id uuid, total bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  _size integer := least(greatest(coalesce(p_page_size, 1000), 1), 1000);
  _content text := nullif(btrim(p_content), '');
  _max bigint := case when p_max_rows is null then null else greatest(p_max_rows, 0) end;
begin
  if _content is not null then
    return query
      with ordered as (
        select k.release_date, k.created_at, k.id,
               row_number() over (order by k.release_date desc, k.created_at desc, k.id) as rn
          from (
            select o.release_date, o.created_at, o.id
              from public.official_items o
             where o.content_name = _content and o.merged_into is null and o.exclude_from_lists = false
             order by o.release_date desc, o.created_at desc, o.id
             limit _max
          ) k
      ), cnt as (select count(*) as n from ordered)
      select 0, null::date, null::timestamptz, null::uuid, cnt.n from cnt
      union all
      select (ordered.rn / _size)::integer, ordered.release_date, ordered.created_at, ordered.id, cnt.n
        from ordered, cnt
       where ordered.rn % _size = 0 and ordered.rn < cnt.n
      order by 1;
  else
    return query
      with ordered as (
        select k.release_date, k.created_at, k.id,
               row_number() over (order by k.release_date desc, k.created_at desc, k.id) as rn
          from (
            select o.release_date, o.created_at, o.id
              from public.official_items o
             where o.merged_into is null and o.exclude_from_lists = false
             order by o.release_date desc, o.created_at desc, o.id
             limit _max
          ) k
      ), cnt as (select count(*) as n from ordered)
      select 0, null::date, null::timestamptz, null::uuid, cnt.n from cnt
      union all
      select (ordered.rn / _size)::integer, ordered.release_date, ordered.created_at, ordered.id, cnt.n
        from ordered, cnt
       where ordered.rn % _size = 0 and ordered.rn < cnt.n
      order by 1;
  end if;
end;
$$;

comment on function public.catalog_page_cursors(text, integer, integer) is
  'カタログ一覧を並列で読むためのページの境目。page_no=0 は先頭（カーソル null）と全体の件数、page_no=k は k*p_page_size 件目の行のキー。';

revoke all on function public.catalog_page_cursors(text, integer, integer) from public;
grant execute on function public.catalog_page_cursors(text, integer, integer) to anon, authenticated, service_role;

-- ===========================================================================
-- d) 一覧に出るグッズ全体の件数（作品を選ばない一覧の「全 ○ 件」）
-- ===========================================================================
-- 【なぜ】作品を選ばない一覧の 1 ページ目は count=exact を付けていて、PostgREST が
--   select count(*) from official_items where merged_into is null and exclude_from_lists = false
-- を毎回流していた。本番（anon）では Seq Scan で 4,322 ms（キャッシュが冷えているとき）/ 20 ms（温まっているとき）。
-- 2026-10-28 23:00 JST 以降のゲストの 5xx（57014）8 件は、すべてこの 1 ページ目だった。
--
-- 【どう数えるか】
--  - 作り置き（catalog_cache_meta がある）: 作品ごとの件数の作り置き（catalog_content_count_cache、10 分ごと）の合計
--    ＋ 作品の無いグッズ（content_name が null / ''）の件数。後ろは keyset の作品の索引の先頭（null と ''）だけを読む
--    （Index Only Scan。作品の無いグッズは少ない）。作品ごとの件数は最大 10 分遅れる（画面の「全 ○ 件」の目安なので構わない）。
--  - 作り置きがまだ無い: 部分索引（official_items_listed_keyset_idx）だけで数える（表の本体は読まない。enable_seqscan = off を
--    この関数にだけ付ける）。作り置きは 20261028010000_catalog_perf.sql の最後に 1 回作るので、普通はこちらには来ない。
-- refresh_catalog_caches() には手を入れない（作り置きの作り方は 20261028010000_catalog_perf.sql のまま）。
create or replace function public.catalog_listed_total()
returns bigint
language plpgsql
stable
security invoker
set search_path = public
-- ほぼ全件を数えると、計画は「表をそのまま全部読む」（Seq Scan）を選ぶ。本番ではそれが冷えていると 4 秒超えだったので、
-- この関数の中だけ Seq Scan を避け、ずっと小さい部分索引だけを読ませる（Index Only Scan）
set enable_seqscan = off
as $$
declare
  _n bigint;
begin
  if exists (select 1 from public.catalog_cache_meta) then
    select coalesce(sum(c.item_count), 0)::bigint
         + (select count(*) from public.official_items o
             where o.content_name is null and o.merged_into is null and o.exclude_from_lists = false)
         + (select count(*) from public.official_items o
             where o.content_name = '' and o.merged_into is null and o.exclude_from_lists = false)
      into _n
      from public.catalog_content_count_cache c;
    return _n;
  end if;

  select count(*) into _n
    from public.official_items o
   where o.merged_into is null and o.exclude_from_lists = false;
  return _n;
end;
$$;

comment on function public.catalog_listed_total() is
  '一覧に出るグッズ（統合済み・一覧から外したものを除く）の件数。作り置き（catalog_content_count_cache）の合計＋作品の無いグッズ。作り置きが無ければ部分索引で数える。';

revoke all on function public.catalog_listed_total() from public;
grant execute on function public.catalog_listed_total() to anon, authenticated, service_role;
