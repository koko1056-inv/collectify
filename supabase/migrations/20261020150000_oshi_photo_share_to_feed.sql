-- 推しフォトをみんなに公開する。
-- 画像ファイルはもともと public バケット（kuji_images）にあるので、コピーは不要。
-- 公開は「推しフォトと同じ画像で、いつもの投稿（item_posts）を1つ作る」ことで実現する。
-- これで既存のタイムライン・フィード・いいね・コメントがそのまま使える。
-- oshi_photos 自体の select 権限は変えない（本人しか読めないまま）。公開した分だけ
-- item_posts 経由でみんなに見える。

ALTER TABLE public.oshi_photos
  ADD COLUMN IF NOT EXISTS shared_post_id uuid REFERENCES public.item_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS oshi_photos_shared_post_idx ON public.oshi_photos (shared_post_id) WHERE shared_post_id IS NOT NULL;

-- 推しフォトを投稿として公開する（1枚につき1回。すでに公開済みならそのまま返す）。
-- item_posts は official_item_id か user_item_id のどちらかが必須なので、グッズと紐づいた
-- 推しフォトだけ公開できる（グッズなしの推しフォトは、UI側で公開トグルを出さない）。
-- ポイントは item_posts 側の award_points_on_post トリガーがそのまま付与する（post_create, +3pt）。
-- 推しフォト自体の daily_photo ポイント（1日1回・+2pt）とは別の実績なので、二重付与ではない。
CREATE OR REPLACE FUNCTION public.share_oshi_photo(_photo_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _photo public.oshi_photos%ROWTYPE;
  _post_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _photo FROM public.oshi_photos WHERE id = _photo_id AND user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF _photo.shared_post_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'post_id', _photo.shared_post_id);
  END IF;
  IF _photo.user_item_id IS NULL THEN
    RAISE EXCEPTION 'oshi_photo_no_item';
  END IF;

  INSERT INTO public.item_posts (user_id, user_item_id, caption)
  VALUES (_uid, _photo.user_item_id, _photo.caption)
  RETURNING id INTO _post_id;

  INSERT INTO public.item_post_images (post_id, image_url, display_order)
  VALUES (_post_id, _photo.image_url, 0);

  UPDATE public.oshi_photos SET shared_post_id = _post_id WHERE id = _photo_id;

  RETURN jsonb_build_object('ok', true, 'already', false, 'post_id', _post_id);
END $$;
REVOKE ALL ON FUNCTION public.share_oshi_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_oshi_photo(uuid) TO authenticated;
