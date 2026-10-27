-- カタログ（/search）で作品を選んだときの「所持率（コンプ率）」。
--
-- get_catalog_completion(_content) は、その作品のグッズについて
--   kind = 'work'      … 作品全体（1 行）
--   kind = 'series'    … シリーズタグごと
--   kind = 'character' … キャラタグごと
--   kind = 'type'      … グッズタイプ（カテゴリ）タグごと
-- の (owned, total) を返す。owned は呼び出した本人（auth.uid()）が user_items で持っている数。
-- ゲスト（auth.uid() が null）は owned が常に 0 で、total だけを使う。
--
-- 数え方（一覧 /search と同じ母数にする）:
--  - 統合済み（merged_into）と、一覧から外したもの（exclude_from_lists = 告知画像など）は数えない。
--    get_collection_progress は exclude_from_lists を見ていないので、そちらとは数が合わないことがある（意図的）。
--  - 同じ名前のタグ（作品ごとに作られた同名シリーズなど）は 1 つにまとめ、1 つのグッズは 1 回だけ数える。
--  - 「なし」や空の名前のタグは数えない（official_item_series と同じ考え方）。
--
-- 速さ: 1 作品は最大で約 1 万件。
--  - official_items は official_items_listed_content_idx（部分索引）で作品を引く。索引の条件と同じ WHERE を書いて使わせる。
--  - item_tags は (official_item_id, tag_id) の一意索引、tags は主キー。
--  - user_items は本人の分だけを (user_id, official_item_id) の索引で読む（下で作る）。
-- 集計 1 回で終わり、グッズごと・タグごとの問い合わせ（N+1）はしない。
--
-- 権限: SECURITY INVOKER。official_items・item_tags・tags は誰でも読める表で、
-- user_items は本人の行を読むだけなので、RLS をそのまま使えばよい（他人の所持は見えない・見ない）。

create index if not exists idx_user_items_user_official
  on public.user_items (user_id, official_item_id)
  where official_item_id is not null;

create or replace function public.get_catalog_completion(_content text)
returns table(kind text, label text, owned integer, total integer)
language sql
stable
security invoker
set search_path to 'public'
as $function$
  with items as materialized (
    select oi.id
      from public.official_items oi
     where oi.content_name = _content
       -- official_items_listed_content_idx と同じ条件
       and oi.merged_into is null
       and oi.exclude_from_lists is not true
       and oi.content_name is not null
       and oi.content_name <> ''
  ),
  mine as materialized (
    select distinct ui.official_item_id as id
      from public.user_items ui
     where ui.user_id = auth.uid()
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
  select 'work'::text,
         _content,
         (count(*) filter (where f.is_owned))::integer,
         count(*)::integer
    from flagged f
  union all
  select g.category::text,
         g.name,
         (count(*) filter (where g.is_owned))::integer,
         count(*)::integer
    from tagged g
   group by g.category, g.name;
$function$;

comment on function public.get_catalog_completion(text) is
  '作品のカタログ所持率。work 1 行と series/character/type の内訳。owned は auth.uid() の所持（ゲストは 0）。merged_into・exclude_from_lists は除く。';

revoke all on function public.get_catalog_completion(text) from public;
grant execute on function public.get_catalog_completion(text) to anon, authenticated;

analyze public.user_items;
