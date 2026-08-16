CREATE TABLE IF NOT EXISTS public.ai_room_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.ai_generated_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_room_likes_user_id ON public.ai_room_likes (user_id);

GRANT SELECT, INSERT, DELETE ON public.ai_room_likes TO authenticated;
GRANT SELECT ON public.ai_room_likes TO anon;
GRANT ALL ON public.ai_room_likes TO service_role;

ALTER TABLE public.ai_room_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_room_likes_select" ON public.ai_room_likes;
CREATE POLICY "ai_room_likes_select"
  ON public.ai_room_likes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "ai_room_likes_insert_own" ON public.ai_room_likes;
CREATE POLICY "ai_room_likes_insert_own"
  ON public.ai_room_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.ai_generated_rooms r
       WHERE r.id = ai_room_likes.room_id AND r.is_public
    )
  );

DROP POLICY IF EXISTS "ai_room_likes_delete_own" ON public.ai_room_likes;
CREATE POLICY "ai_room_likes_delete_own"
  ON public.ai_room_likes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_ai_room_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ai_generated_rooms
       SET like_count = like_count + 1
     WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ai_generated_rooms
       SET like_count = GREATEST(like_count - 1, 0)
     WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ai_room_likes_sync_count ON public.ai_room_likes;
CREATE TRIGGER trg_ai_room_likes_sync_count
  AFTER INSERT OR DELETE ON public.ai_room_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_ai_room_like_count();

UPDATE public.ai_generated_rooms r
   SET like_count = COALESCE(
         (SELECT count(*) FROM public.ai_room_likes l WHERE l.room_id = r.id), 0
       )
 WHERE r.like_count <> COALESCE(
         (SELECT count(*) FROM public.ai_room_likes l WHERE l.room_id = r.id), 0
       );

CREATE OR REPLACE FUNCTION public.toggle_ai_room_like(_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_public boolean;
  _liked boolean;
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_public INTO _is_public FROM public.ai_generated_rooms WHERE id = _room_id;
  IF _is_public IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF NOT _is_public THEN
    RAISE EXCEPTION 'Room is not public';
  END IF;

  DELETE FROM public.ai_room_likes
   WHERE room_id = _room_id AND user_id = _uid;

  IF FOUND THEN
    _liked := false;
  ELSE
    INSERT INTO public.ai_room_likes (room_id, user_id) VALUES (_room_id, _uid);
    _liked := true;
  END IF;

  SELECT like_count INTO _count FROM public.ai_generated_rooms WHERE id = _room_id;

  RETURN jsonb_build_object('liked', _liked, 'like_count', COALESCE(_count, 0));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.toggle_ai_room_like(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_ai_room_like(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.login_bonus_tiers (
  min_streak integer PRIMARY KEY CHECK (min_streak >= 1),
  points integer NOT NULL CHECK (points > 0)
);

GRANT SELECT ON public.login_bonus_tiers TO anon, authenticated;
GRANT ALL ON public.login_bonus_tiers TO service_role;

ALTER TABLE public.login_bonus_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_bonus_tiers_select" ON public.login_bonus_tiers;
CREATE POLICY "login_bonus_tiers_select" ON public.login_bonus_tiers
  FOR SELECT USING (true);

INSERT INTO public.login_bonus_tiers (min_streak, points) VALUES
  (1,  10),
  (3,  15),
  (7,  20),
  (14, 30),
  (30, 50)
ON CONFLICT (min_streak) DO UPDATE SET points = EXCLUDED.points;

CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot claim another user''s login bonus';
  END IF;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_login_bonus_date, login_streak
    INTO _last_login_date, _login_streak
    FROM public.user_points
   WHERE user_id = _user_id
     FOR UPDATE;

  IF _last_login_date = CURRENT_DATE THEN
    RETURN false;
  END IF;

  IF _last_login_date = CURRENT_DATE - 1 THEN
    _login_streak := COALESCE(_login_streak, 0) + 1;
  ELSE
    _login_streak := 1;
  END IF;

  SELECT points INTO _bonus_points
    FROM public.login_bonus_tiers
   WHERE min_streak <= _login_streak
   ORDER BY min_streak DESC
   LIMIT 1;

  _bonus_points := COALESCE(_bonus_points, 10);

  UPDATE public.user_points
     SET total_points = total_points + _bonus_points,
         last_login_bonus_date = CURRENT_DATE,
         login_streak = _login_streak,
         last_login_date = CURRENT_DATE,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_user_id, _bonus_points, 'login_bonus',
          'ログインボーナス (ストリーク: ' || _login_streak || ')');

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_login_bonus(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_login_bonus(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_item_quantity(
  _official_item_id uuid,
  _by integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _target uuid;
  _total integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _by <= 0 THEN
    RAISE EXCEPTION 'Invalid increment';
  END IF;

  SELECT id INTO _target
    FROM public.user_items
   WHERE user_id = _uid AND official_item_id = _official_item_id
   ORDER BY created_at ASC
   LIMIT 1
     FOR UPDATE;

  IF _target IS NULL THEN
    RETURN jsonb_build_object('success', false, 'not_found', true);
  END IF;

  UPDATE public.user_items
     SET quantity = COALESCE(quantity, 1) + _by
   WHERE id = _target;

  SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) INTO _total
    FROM public.user_items
   WHERE user_id = _uid AND official_item_id = _official_item_id;

  RETURN jsonb_build_object('success', true, 'quantity', _total);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_item_quantity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_item_quantity(uuid, integer) TO authenticated;

DROP POLICY IF EXISTS "avatar_gallery_select" ON public.avatar_gallery;
CREATE POLICY "avatar_gallery_select"
  ON public.avatar_gallery
  FOR SELECT
  USING (auth.uid() = user_id OR is_public);

DROP POLICY IF EXISTS "avatar_gallery_update_own" ON public.avatar_gallery;
CREATE POLICY "avatar_gallery_update_own"
  ON public.avatar_gallery
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "avatar_gallery_delete_own" ON public.avatar_gallery;
CREATE POLICY "avatar_gallery_delete_own"
  ON public.avatar_gallery
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "avatar_gallery_insert_own" ON public.avatar_gallery;
CREATE POLICY "avatar_gallery_insert_own"
  ON public.avatar_gallery
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avatar_gallery TO authenticated;