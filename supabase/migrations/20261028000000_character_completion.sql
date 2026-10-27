-- キャラページ（/character/:tagId）の「所持率」。
--
-- get_character_completion(_tag_id) は、そのキャラのグッズについて
--   kind = 'work'   … キャラ全体（1 行。label はキャラ名）
--   kind = 'series' … シリーズタグごと
--   kind = 'type'   … グッズタイプ（カテゴリ）タグごと
-- の (owned, total) を返す。形は get_catalog_completion と同じ（画面側の部品をそのまま使うため）。
-- owned は呼び出した本人（auth.uid()）が user_items で持っている数。ゲスト（anon）は常に 0。
--
-- キャラの範囲:
--  - _tag_id のタグ（category = 'character'）と、同じ作品（content_id）で同じ名前のキャラタグをまとめて 1 人として数える。
--    作品が違えば同じ名前でも別のキャラ（content_id で分ける）。
--  - 1 つのグッズは 1 回だけ数える（同じキャラの重複タグが両方付いていても 1 件）。
--
-- 数え方（一覧と同じ母数）:
--  - 統合済み（merged_into）と一覧から外したもの（exclude_from_lists）は数えない。
--  - 「なし」や空の名前のシリーズ・種類タグは数えない（get_catalog_completion と同じ）。
--
-- 速さ（DB は CPU が少なく、anon の statement_timeout は 3 秒）:
--  - 出発点は item_tags.tag_id（idx_item_tags_tag_id）。キャラ 1 人は多くても数千件なので、作品全体（約 1 万件）より軽い。
--  - official_items は主キー、item_tags は (official_item_id, tag_id) の一意索引、tags は主キーで引く。
--  - user_items は本人の分だけを idx_user_items_user_official（20261027230000 で作成）で読む。
--  - 集計は 1 回。グッズごと・タグごとの問い合わせ（N+1）はしない。
--
-- 権限: SECURITY INVOKER。official_items・item_tags・tags は誰でも読める表で、
-- user_items は本人の行だけを RLS のまま読む（他人の所持は見ない・見えない）。読み取りだけで、書き込みはしない。

create or replace function public.get_character_completion(_tag_id uuid)
returns table(kind text, label text, owned integer, total integer)
language sql
stable
security invoker
set search_path to 'public'
as $function$
  with base as (
    select t.name, t.content_id
      from public.tags t
     where t.id = _tag_id
       and t.category = 'character'
  ),
  char_tags as materialized (
    select t.id
      from public.tags t
      join base b
        on t.name = b.name
       and t.content_id is not distinct from b.content_id
     where t.category = 'character'
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
     where t.category in ('series', 'type')
       and t.name is not null
       and btrim(t.name) not in ('', 'なし')
  )
  select 'work'::text,
         (select b.name from base b),
         (count(*) filter (where f.is_owned))::integer,
         count(*)::integer
    from flagged f
  -- キャラのタグでない・無い id のときは 1 行も返さない（集計だけだと 0 件の行が出てしまう）
  having exists (select 1 from base)
  union all
  select g.category::text,
         g.name,
         (count(*) filter (where g.is_owned))::integer,
         count(*)::integer
    from tagged g
   group by g.category, g.name;
$function$;

comment on function public.get_character_completion(uuid) is
  'キャラページの所持率。work 1 行（キャラ全体）と series/type の内訳。同じ作品の同名キャラタグはまとめる。owned は auth.uid() の所持（ゲストは 0）。merged_into・exclude_from_lists は除く。';

revoke all on function public.get_character_completion(uuid) from public;
grant execute on function public.get_character_completion(uuid) to anon, authenticated;
