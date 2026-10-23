-- ユーザー向けのグッズ一覧・検索・ピッカーに、告知・発売告知・プレスリリースの OGP コラージュ画像が
-- 実物の商品写真として混ざって出てしまう問題への対応。
--
-- 行は削除しない（user_items が参照していることがあるため）。代わりに official_items に
-- exclude_from_lists フラグを追加し、ユーザー向けの一覧・検索からだけ隠す。管理画面（Admin*）は
-- 運用者がフラグを外せるよう、このマイグレーションでは絞り込みを加えない。
--
-- ヒューリスティック:
--   A. 画像ホスト/パスがニュース・告知系で、実物の商品写真であることがまず無いもの（animeanime.jp 等、/ogp_f/ 等のパス）
--   B. 画像（? 以降を除く）が、PR TIMES / アニメイトカフェ CDN 等のホストで、2件以上の official_items に
--      共有されているもの（複数商品ページが同じプレスリリース画像を指している = 告知コラージュの使い回し）
--   C. タイトル文言（発売決定、発売告知 等）は、現時点でカタログに一致が無く・誤検出のリスクがあるため、
--      このマイグレーションでは backfill に使わない（将来、ニュース系ホストと組み合わせて使う場合のための
--      コメントのみ残す）。

-- 1) カラム追加 -----------------------------------------------------------
alter table public.official_items
  add column if not exists exclude_from_lists boolean not null default false;

alter table public.official_items
  add column if not exists exclude_reason text null;

comment on column public.official_items.exclude_from_lists is
  '告知・発売告知・PRコラージュ等、実物の商品写真でない疑いが高い行をユーザー向け一覧・検索から隠すフラグ。行は削除しない（user_items からの参照を保つ）。';
comment on column public.official_items.exclude_reason is
  '機械判定の簡単な理由（news_ogp_host / ogp_path / shared_pr_collage 等）。運用の目視確認用。';

-- 2) 判定ヒューリスティックを1箇所にまとめるヘルパー（ヒューリスティック A: ホスト/パス単体で判定できるもの） ----
create or replace function public.is_announcement_image(url text)
returns boolean
language sql
immutable
as $$
  select url is not null and (
    url ilike '%animeanime.jp%'
    or url ilike '%/ogp_f/%'
    or url ilike '%/imgs/ogp%'
    or url ilike '%/ogp/%'
    or url ilike '%og-image%'
    or url ilike '%opengraph%'
  );
$$;

comment on function public.is_announcement_image(text) is
  '画像URLがニュース/告知/OGP系ホスト・パスか（ヒューリスティックA）。import_official_batch() と backfill の両方から使う、判定の単一の場所。';

-- 3) バックフィル（idempotent: 既にフラグが立っている行は対象にしない） -----------------------------------

-- A. ニュース/告知/OGP ホスト・パス
update public.official_items o
set exclude_from_lists = true,
    exclude_reason = 'news_ogp_host'
where o.merged_into is null
  and not o.exclude_from_lists
  and public.is_announcement_image(o.image);

-- B. PR TIMES / アニメイトカフェ CDN 等で、同じ画像（?以降を除く）が2件以上の official_items に
--    共有されている（= 同じプレスリリース/告知画像の使い回し）。animeanime.jp は A で既に対象。
with shared as (
  select split_part(o.image, '?', 1) as base_image
  from public.official_items o
  where o.merged_into is null
    and (
      o.image ilike '%prtimes.jp%'
      or o.image ilike '%prcdn.freetls.fastly.net%'
      or o.image ilike '%cdn.animatecafe.jp%'
    )
  group by split_part(o.image, '?', 1)
  having count(*) >= 2
)
update public.official_items o
set exclude_from_lists = true,
    exclude_reason = 'shared_pr_collage'
where o.merged_into is null
  and not o.exclude_from_lists
  and split_part(o.image, '?', 1) in (select base_image from shared);

-- 4) ユーザー向け検索 RPC に絞り込みを追加 -----------------------------------------------------
-- 直近の定義（20261012000000_fix_progress_and_search_timeouts.sql）の本体をそのまま引き継ぎ、
-- WHERE に exclude_from_lists の除外だけを足す（1文字検索の時間切れ対策・あいまい検索は変えない）。
create or replace function public.search_official_items(_q text, _limit integer default 200, _offset integer default 0)
returns table(id uuid, total bigint)
language plpgsql
stable security definer
set search_path to 'public', 'extensions'
as $function$
declare
  _nq text := public.search_norm(_q);
  _tokens text[];
  _t text;
  _exact text := '';
  _fuzzy text := '';
  _score text := '0';
  _like text;
  _cnt bigint;
begin
  select coalesce(array_agg(replace(tk, ' ', '')), array[]::text[]) into _tokens
    from (select tk from unnest(string_to_array(_nq, ' ')) as tk where tk <> '' limit 6) s;
  if array_length(_tokens, 1) is null then return; end if;
  -- 1文字だけの言葉は、ほぼ全件に当たって数え直しが重く、時間切れになっていた。2文字から探す
  if char_length(array_to_string(_tokens, '')) < 2 then return; end if;

  foreach _t in array _tokens loop
    _like := '%' || replace(replace(replace(_t, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    _exact := _exact || format(' AND o.search_text LIKE %L', _like);
    if char_length(_t) >= 3 then
      _fuzzy := _fuzzy || format(' AND (o.search_text LIKE %L OR %L <%% o.search_text)', _like, _t);
      _score := _score || format(' + word_similarity(%L, o.search_text)', _t);
    else
      _fuzzy := _fuzzy || format(' AND o.search_text LIKE %L', _like);
    end if;
  end loop;

  -- まず、含む（表記ゆれは正規化済み）で探す。少なければ、打ち間違いも許して探し直す
  execute 'SELECT count(*) FROM public.official_items o WHERE o.merged_into IS NULL AND o.exclude_from_lists IS NOT TRUE' || _exact into _cnt;
  if _cnt >= 8 then
    return query execute
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL AND o.exclude_from_lists IS NOT TRUE' || _exact ||
      ' ORDER BY o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      using _limit, _offset;
  else
    perform set_config('pg_trgm.word_similarity_threshold', '0.5', true);
    return query execute
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL AND o.exclude_from_lists IS NOT TRUE' || _fuzzy ||
      ' ORDER BY (' || _score || ') DESC, o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      using _limit, _offset;
  end if;
end $function$;

revoke all on function public.search_official_items(text, integer, integer) from public;
grant execute on function public.search_official_items(text, integer, integer) to anon, authenticated;

-- 直近の定義（20261007000000_social_reactions_and_progress.sql）の本体をそのまま引き継ぎ、
-- hits の WHERE に exclude_from_lists の除外だけを足す。
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
      and oi.exclude_from_lists is not true
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

-- 5) 「人気のグッズ」「作品チップ件数」「作品カードの表紙」も同じ絞り込みを足す ------------------------

create or replace function public.get_popular_goods_for_contents(
  _contents text[],
  _limit integer default 10
)
returns table (
  id uuid,
  title text,
  image text,
  content_name text,
  owner_count integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select oi.id, oi.title, oi.image, oi.content_name,
         count(distinct ui.user_id)::integer as owner_count
  from public.official_items oi
  join public.user_items ui on ui.official_item_id = oi.id
  where oi.content_name = any (_contents)
    and oi.merged_into is null
    and oi.exclude_from_lists is not true
    and public.can_view_collection(ui.user_id)
  group by oi.id, oi.title, oi.image, oi.content_name
  order by owner_count desc, max(ui.created_at) desc
  limit least(greatest(coalesce(_limit, 10), 1), 30);
$$;

revoke all on function public.get_popular_goods_for_contents(text[], integer) from public, anon;
grant execute on function public.get_popular_goods_for_contents(text[], integer) to authenticated;

create or replace function public.catalog_content_counts()
returns table(content_name text, item_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select o.content_name, count(*)::bigint
  from public.official_items o
  where o.merged_into is null and o.exclude_from_lists is not true
    and o.content_name is not null and o.content_name <> ''
  group by o.content_name
  order by count(*) desc, o.content_name;
$$;

grant execute on function public.catalog_content_counts() to anon, authenticated;

create or replace function public.catalog_content_covers(per_content int default 2)
returns table(content_name text, images text[])
language sql
stable
set search_path to 'public'
as $$
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
$$;

grant execute on function public.catalog_content_covers(int) to anon, authenticated;

-- 6) 取り込み時に、同じホスト/パスの告知画像をあらかじめ弾く（import_official_batch）----------------
-- 直近の定義（20261010860000_import_official_batch_dedupe.sql）の本体をそのまま引き継ぎ、
--   - INSERT 時に is_announcement_image() に当たる画像は exclude_from_lists = true で入れる（ヒューリスティックA）
--   - INSERT 直後に、今回入れた行の中で PR TIMES 等の画像が既存行と共有されているものを追加でフラグする（ヒューリスティックB）
create or replace function public.import_official_batch(j jsonb, cname text, pre text)
returns integer
language plpgsql
set search_path = public, extensions
as $fn$
declare
  cid uuid;
  ns uuid := '6f1c2a52-8d0e-4b8e-9d6a-0c1b6a7e5d11';
  n int;
begin
  -- 新商品の通知は投入中だけ止める（終わりに必ず戻す。失敗すれば全体が巻き戻る）
  alter table public.official_items disable trigger notify_new_official_item;
  alter table public.official_items disable trigger trigger_notify_users_of_new_item;
  alter table public.item_tags disable trigger trigger_notify_users_of_new_item_tag;

  insert into public.content_names (name, type) select cname, 'anime' where not exists (select 1 from public.content_names where name = cname);
  select id into cid from public.content_names where name = cname order by created_at limit 1;

  -- ID が違っても、同じ作品の同じタイトル、または同じ画像（? 以降を除く）の商品は対象から外す
  -- （取得元ごとに ID の付け方が違った過去の取り込みと、二重にならないように）。同じ ID の商品は残す（タグの補完のため）
  create temp table _imp on commit drop as
  select r.* from (
    select extensions.uuid_generate_v5(ns, x.i) as id, x.t as title, pre || x.im as image, coalesce(x.p,'') as price, x.d as rel, x.ty, x.s, x.c, x.sr
    from jsonb_to_recordset(j) as x(i text, t text, im text, p text, d date, ty text, s text, c jsonb, sr jsonb)
  ) r
  where exists (select 1 from public.official_items o where o.id = r.id)
     or (not exists (select 1 from public.official_items o where o.content_name = cname and o.title = r.title)
         and not exists (select 1 from public.official_items o where split_part(o.image, '?', 1) = split_part(r.image, '?', 1)));

  create temp table _imp_tags on commit drop as
  select distinct id, tagstr from (
    select id, 'content|' || cname as tagstr from _imp
    union all select id, 'type|' || ty from _imp where ty is not null
    union all select id, 'series|' || s from _imp where s is not null
    union all select id, 'source|' || v from _imp, jsonb_array_elements_text(coalesce(sr,'[]'::jsonb)) v
    union all select id, 'character|' || v from _imp, jsonb_array_elements_text(coalesce(c,'[]'::jsonb)) v
  ) q;

  insert into public.tags (name, category, content_id, display_context)
  select distinct split_part(tagstr,'|',2), split_part(tagstr,'|',1),
         case when split_part(tagstr,'|',1) in ('series','character') then cid end,
         case split_part(tagstr,'|',1) when 'series' then 'シリーズ' when 'type' then 'グッズタイプ' when 'source' then '入手方法' when 'character' then 'キャラクター' else '作品' end
  from _imp_tags
  where not exists (select 1 from public.tags e where e.name = split_part(tagstr,'|',2) and e.category = split_part(tagstr,'|',1));

  insert into public.official_items (id, title, image, price, release_date, content_name, item_type, created_by, exclude_from_lists, exclude_reason)
  select id, title, image, price, rel, cname, 'official', '2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3'::uuid,
         public.is_announcement_image(image),
         case when public.is_announcement_image(image) then 'news_ogp_host' else null end
  from _imp
  on conflict (id) do nothing;
  get diagnostics n = row_count;

  -- ヒューリスティックB: 今回入れた行のうち、PR TIMES 等の画像が既存の他の行と共有されているものを追加でフラグする
  update public.official_items o
  set exclude_from_lists = true,
      exclude_reason = 'shared_pr_collage'
  where o.id in (select id from _imp)
    and not o.exclude_from_lists
    and (
      o.image ilike '%prtimes.jp%'
      or o.image ilike '%prcdn.freetls.fastly.net%'
      or o.image ilike '%cdn.animatecafe.jp%'
    )
    and exists (
      select 1 from public.official_items o2
      where o2.merged_into is null
        and o2.id <> o.id
        and split_part(o2.image, '?', 1) = split_part(o.image, '?', 1)
    );

  insert into public.item_tags (official_item_id, tag_id)
  select distinct q.id, pick.id
  from _imp_tags q
  join lateral (select e.id from public.tags e where e.name = split_part(q.tagstr,'|',2) and e.category = split_part(q.tagstr,'|',1) order by e.usage_count desc, e.created_at limit 1) pick on true
  where exists (select 1 from public.official_items o where o.id = q.id)
  on conflict do nothing;

  alter table public.official_items enable trigger notify_new_official_item;
  alter table public.official_items enable trigger trigger_notify_users_of_new_item;
  alter table public.item_tags enable trigger trigger_notify_users_of_new_item_tag;
  return n;
end
$fn$;

revoke all on function public.import_official_batch(jsonb, text, text) from public, anon, authenticated;

-- 既存の (content_name, release_date DESC) WHERE merged_into IS NULL 索引は、
-- 「merged_into IS NULL AND exclude_from_lists IS NOT TRUE」という今回のクエリ条件を含んでいる
-- （後者は前者より狭い）ため、そのままインデックススキャンに使える。exclude_from_lists は
-- ごく一部の行にしか立たない想定で、追加のフィルタ評価コストも小さいため、専用の twin index は作らない。
