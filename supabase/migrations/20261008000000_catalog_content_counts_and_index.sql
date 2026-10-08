-- 作品ごとのグッズ件数。カタログが数万件になっても、作品の一覧とチップの件数を軽く出せるようにする。
CREATE OR REPLACE FUNCTION public.catalog_content_counts()
RETURNS TABLE(content_name text, item_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT o.content_name, count(*)::bigint
  FROM public.official_items o
  WHERE o.merged_into IS NULL AND o.content_name IS NOT NULL AND o.content_name <> ''
  GROUP BY o.content_name
  ORDER BY count(*) DESC, o.content_name;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_content_counts() TO anon, authenticated;

-- 作品ごとに発売日の新しい順で取る（一覧から選ぶ・探索）ための索引
CREATE INDEX IF NOT EXISTS official_items_content_release_idx
  ON public.official_items (content_name, release_date DESC)
  WHERE merged_into IS NULL;
