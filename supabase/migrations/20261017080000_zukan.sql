-- 図鑑ビュー（コレクション画面の並べ方のひとつ）。
--
-- いまの一覧は「持っているグッズ」だけを並べるので、シリーズのうち何が足りないのかは見えなかった。
-- 図鑑では、シリーズ（series タグ）ごとに、カタログ全体を番号順（発売日の古い順）に並べ、
-- 持っているものはカラー、まだのものはシルエットで見せる。
--
--   get_zukan_index(_user_id)          持っているグッズに付いているシリーズの一覧（持っている数・全体の数・表紙）
--   get_zukan_series(_key, _user_id)   1つのシリーズの全グッズ（持っているかどうか付き。多くても 300 件まで）
--
-- 作品（content_name）は数万件のものがあり図鑑にならないので、シリーズだけにした。
-- 人のコレクションも、見てよい相手（can_view_collection）なら見られる。

create or replace function public.get_zukan_index(_user_id uuid default null)
returns table(key text, label text, owned integer, total integer, cover text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  if target is null or not public.can_view_collection(target) then
    return;
  end if;

  return query
  with my as materialized (
    select distinct on (ui.official_item_id)
           ui.official_item_id as oid,
           ui.created_at,
           coalesce(nullif(ui.image, ''), oi.image) as img
      from public.user_items ui
      join public.official_items oi on oi.id = ui.official_item_id and oi.merged_into is null
     where ui.user_id = target
     order by ui.official_item_id, ui.created_at desc
  ),
  s as (
    select lower(btrim(t.name)) as k,
           min(btrim(t.name)) as n,
           count(distinct m.oid)::integer as owned_n,
           (array_agg(m.img order by m.created_at desc) filter (where m.img is not null))[1] as cover
      from my m
      join public.item_tags it on it.official_item_id = m.oid
      join public.tags t on t.id = it.tag_id and t.category = 'series'
     where t.name is not null and btrim(t.name) not in ('', 'なし')
     group by lower(btrim(t.name))
  )
  select s.k,
         s.n,
         s.owned_n,
         -- 大きすぎるシリーズは 501 で数えるのをやめる（図鑑では「300 件より多い」とだけ分かればよい）
         greatest(
           (select count(*) from (select 1 from public.collection_target_members('series', s.k) limit 501) c)::integer,
           s.owned_n
         ),
         s.cover
    from s
   order by s.owned_n desc, s.k;
end;
$function$;

revoke all on function public.get_zukan_index(uuid) from public;
grant execute on function public.get_zukan_index(uuid) to anon, authenticated;

create or replace function public.get_zukan_series(_key text, _user_id uuid default null)
returns table(
  official_item_id uuid,
  title text,
  image text,
  release_date text,
  user_item_id uuid,
  user_image text
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
  if target is null or not public.can_view_collection(target) or _key is null then
    return;
  end if;

  return query
  with members as (
    select x.oid from public.collection_target_members('series', lower(btrim(_key))) as x(oid)
  ),
  mine as (
    select distinct on (ui.official_item_id)
           ui.official_item_id as oid, ui.id, nullif(ui.image, '') as img
      from public.user_items ui
     where ui.user_id = target
       and ui.official_item_id in (select oid from members)
     order by ui.official_item_id, ui.created_at desc
  )
  select oi.id, oi.title, oi.image, oi.release_date::text, mi.id, mi.img
    from members mb
    join public.official_items oi on oi.id = mb.oid
    left join mine mi on mi.oid = mb.oid
   order by oi.release_date asc nulls last, oi.created_at asc, oi.id
   limit 300;
end;
$function$;

revoke all on function public.get_zukan_series(text, uuid) from public;
grant execute on function public.get_zukan_series(text, uuid) to anon, authenticated;
