-- 作品ごとの「表紙」にする、新しいグッズの写真（数枚・重複なし）。
-- ウェルカムの推し選びで、作品カードにその作品の実物のグッズを並べて見せるのに使う。
-- content_names.image_url は1件も入っていないため、カタログの写真から作る。
-- 作品一覧（数十件）から引き、各作品は (content_name, release_date DESC) の索引で新しい順に数件だけ読む。
CREATE OR REPLACE FUNCTION public.catalog_content_covers(per_content int DEFAULT 2)
RETURNS TABLE(content_name text, images text[])
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.name, p.images
  FROM public.content_names c
  CROSS JOIN LATERAL (
    SELECT array_agg(r.image ORDER BY r.newest DESC) AS images
    FROM (
      SELECT recent.image, max(recent.release_date) AS newest
      FROM (
        SELECT o.image, o.release_date
        FROM public.official_items o
        WHERE o.content_name = c.name
          AND o.merged_into IS NULL
          AND o.release_date IS NOT NULL
          AND o.image IS NOT NULL AND o.image <> '' AND o.image <> '/placeholder.svg'
        ORDER BY o.release_date DESC
        LIMIT 12
      ) recent
      GROUP BY recent.image
      ORDER BY newest DESC
      LIMIT least(greatest(per_content, 1), 4)
    ) r
  ) p
  WHERE p.images IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_content_covers(int) TO anon, authenticated;
