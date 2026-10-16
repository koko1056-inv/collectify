-- 作品ごとの「人気のグッズ」（持っている人が多い順）を返す RPC
--
-- いまアプリは「この作品で人気のグッズ」を、既存の search_official_items_with_owners(作品名) で代わりに出している。
-- あの関数は作品名・グッズ名・タグに当たる先頭300件を先に切ってから持ち主の数で並べるため、
-- ちいかわのような大きな作品（数千件）では、人気のグッズが300件の外にあると出てこない。
-- この関数は、持ち主のいるグッズ（user_items）から逆にたどるので、取りこぼしが無い。
--
-- 見える範囲は search_official_items_with_owners と同じ（can_view_collection: 非公開の人・ブロックの関係は数えない）。
-- アプリ（src/hooks/useOshiReleases.ts の usePopularGoods）は、この関数があれば使い、無ければ（404）従来の関数で代わりにする。
CREATE OR REPLACE FUNCTION public.get_popular_goods_for_contents(
  _contents text[],
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  image text,
  content_name text,
  owner_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT oi.id, oi.title, oi.image, oi.content_name,
         count(DISTINCT ui.user_id)::integer AS owner_count
  FROM public.official_items oi
  JOIN public.user_items ui ON ui.official_item_id = oi.id
  WHERE oi.content_name = ANY (_contents)
    AND oi.merged_into IS NULL
    AND public.can_view_collection(ui.user_id)
  GROUP BY oi.id, oi.title, oi.image, oi.content_name
  ORDER BY owner_count DESC, max(ui.created_at) DESC
  LIMIT least(greatest(coalesce(_limit, 10), 1), 30);
$$;

REVOKE ALL ON FUNCTION public.get_popular_goods_for_contents(text[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_popular_goods_for_contents(text[], integer) TO authenticated;

-- 使う索引: official_items_content_release_idx（content_name で絞る）/ idx_user_items_official_item_id（持ち主をたどる）。
-- 確かめ方: SELECT * FROM public.get_popular_goods_for_contents(ARRAY['ちいかわ'], 10);
