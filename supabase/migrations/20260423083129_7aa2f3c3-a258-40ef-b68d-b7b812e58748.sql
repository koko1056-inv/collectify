CREATE OR REPLACE FUNCTION public.set_current_avatar(_avatar_id uuid)
 RETURNS TABLE(id uuid, image_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _image_url text;
BEGIN
  -- 自分のアバターであることを確認
  SELECT ag.user_id, ag.image_url
  INTO _user_id, _image_url
  FROM public.avatar_gallery ag
  WHERE ag.id = _avatar_id;

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

  RETURN QUERY SELECT _avatar_id AS id, _image_url AS image_url;
END;
$function$;