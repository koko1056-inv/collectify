-- カタログの絞り込み（タグから選択）で使う、タグごとのグッズ数。
--
-- 以前は画面側で「作品のグッズの id を全部取る → item_tags?official_item_id=in.(…何千件…)」としていた。
-- ちいかわ（約1万件）では URL が 3万字を超えて HTTP 400 になり、タグが1つも出なかった。
-- しかも id は1回に1000件までしか返らないので、通ったとしても数が足りなかった。
-- ここで作品名を受け取り、サーバー側で結合して数えるので、1回の呼び出しで済む。
--
-- _content_name が NULL（すべての作品）のときは、全グッズについて数える。
-- 読み取り専用。権限は呼び出した人のまま（SECURITY INVOKER）なので、RLS もそのまま効く。

create or replace function public.catalog_tag_counts(_content_name text default null)
returns table(
  id uuid,
  name text,
  category text,
  content_id uuid,
  created_at timestamptz,
  item_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.name, t.category, t.content_id, t.created_at, count(*)::bigint as item_count
  from public.item_tags it
  join public.official_items o on o.id = it.official_item_id
  join public.tags t on t.id = it.tag_id
  where o.merged_into is null
    and o.exclude_from_lists is not true
    and (_content_name is null or o.content_name = _content_name)
  group by t.id, t.name, t.category, t.content_id, t.created_at
  order by count(*) desc, t.name;
$$;

revoke all on function public.catalog_tag_counts(text) from public;
grant execute on function public.catalog_tag_counts(text) to anon, authenticated;

-- item_tags を official_item_id から引くための索引（tag_id 側は idx_item_tags_tag_id がある）
create index if not exists idx_item_tags_official_item_id
  on public.item_tags (official_item_id);
