-- 既存データの正規化: 1ユーザーあたり複数の is_current=true があれば最新1件だけ残す
WITH ranked AS (
  SELECT id,
         user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.avatar_gallery
  WHERE is_current = true
)
UPDATE public.avatar_gallery ag
SET is_current = false
FROM ranked r
WHERE ag.id = r.id AND r.rn > 1;

-- アバター切替をアトミックに行うRPC
CREATE OR REPLACE FUNCTION public.set_current_avatar(_avatar_id uuid)
RETURNS TABLE (id uuid, image_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _image_url text;
BEGIN
  -- 自分のアバターであることを確認
  SELECT user_id, image_url
  INTO _user_id, _image_url
  FROM public.avatar_gallery
  WHERE avatar_gallery.id = _avatar_id;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Avatar not found';
  END IF;

  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- すべて false にしてから対象を true に
  UPDATE public.avatar_gallery
  SET is_current = false
  WHERE user_id = _user_id;

  UPDATE public.avatar_gallery
  SET is_current = true
  WHERE avatar_gallery.id = _avatar_id;

  -- プロフィールの avatar_url も同期
  UPDATE public.profiles
  SET avatar_url = _image_url
  WHERE profiles.id = _user_id;

  RETURN QUERY SELECT _avatar_id, _image_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_current_avatar(uuid) TO authenticated;