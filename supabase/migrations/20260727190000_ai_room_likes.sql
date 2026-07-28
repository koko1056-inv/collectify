-- =========================================================
-- AIルームのいいねを機能させる
--
-- ai_generated_rooms.like_count は探索カードにも詳細ページにも表示されて
-- いたが、加算する経路がどこにも無く、常に 0 のままだった
-- （room_likes は3Dルーム = binder_pages 用の別テーブル）。
--
-- 直前のマイグレーションでアバター側に作ったのと同じ形を通す。
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_room_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.ai_generated_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_room_likes_user_id ON public.ai_room_likes (user_id);

ALTER TABLE public.ai_room_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_room_likes_select" ON public.ai_room_likes;
CREATE POLICY "ai_room_likes_select"
  ON public.ai_room_likes
  FOR SELECT
  USING (true);

-- 自分のいいねだけ作れる。かつ公開ルームに対してのみ。
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

GRANT SELECT, INSERT, DELETE ON public.ai_room_likes TO authenticated;
GRANT SELECT ON public.ai_room_likes TO anon;


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


-- 表示されていた数値は実体を伴わないので、いいねの実数に合わせ直す。
-- （これまで加算経路が無かったため、実質すべて 0 になる）
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
