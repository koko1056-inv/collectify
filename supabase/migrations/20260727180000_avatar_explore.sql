-- =========================================================
-- AIアバターの探索を成立させる
--
-- 探索タブ（ExploreHub の AvatarsTab）は「準備中」のプレースホルダーだった。
-- 理由は UI ではなくデータモデル側で、avatar_gallery は
--   ・公開フラグが無い
--   ・SELECT ポリシーが USING (auth.uid() = user_id) の自分専用
-- のため、他人のアバターは原理的に読めなかった。
--
-- ai_generated_rooms と同じ土台（is_public / like_count / いいねテーブル）を
-- アバター側にも用意する。
--
-- 既存アバターはすべて非公開のまま（is_public のデフォルトは false）。
-- 公開はユーザーが明示的に選ぶオプトインとする。
-- =========================================================


-- ---------------------------------------------------------
-- 1. 公開フラグとカウンタ
-- ---------------------------------------------------------
ALTER TABLE public.avatar_gallery
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.avatar_gallery
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.avatar_gallery
  DROP CONSTRAINT IF EXISTS avatar_gallery_like_count_non_negative;
ALTER TABLE public.avatar_gallery
  ADD CONSTRAINT avatar_gallery_like_count_non_negative CHECK (like_count >= 0);

-- 公開フィードの並び（新着順）を引くための索引
CREATE INDEX IF NOT EXISTS idx_avatar_gallery_public_created_at
  ON public.avatar_gallery (created_at DESC)
  WHERE is_public;


-- ---------------------------------------------------------
-- 2. SELECT ポリシーを「自分 or 公開」に広げる
--    更新・削除は従来どおり本人のみ。
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own avatars" ON public.avatar_gallery;
DROP POLICY IF EXISTS "avatar_gallery_select" ON public.avatar_gallery;

CREATE POLICY "avatar_gallery_select"
  ON public.avatar_gallery
  FOR SELECT
  USING (auth.uid() = user_id OR is_public);


-- ---------------------------------------------------------
-- 3. いいね
--    ai_generated_rooms.like_count は表示だけで加算経路が無いが、
--    アバター側は実際に増減するようトリガで同期する。
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avatar_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id uuid NOT NULL REFERENCES public.avatar_gallery(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avatar_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_avatar_likes_user_id ON public.avatar_likes (user_id);

ALTER TABLE public.avatar_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avatar_likes_select" ON public.avatar_likes;
CREATE POLICY "avatar_likes_select"
  ON public.avatar_likes
  FOR SELECT
  USING (true);

-- 自分のいいねだけ作れる。かつ公開アバターに対してのみ。
DROP POLICY IF EXISTS "avatar_likes_insert_own" ON public.avatar_likes;
CREATE POLICY "avatar_likes_insert_own"
  ON public.avatar_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.avatar_gallery g
       WHERE g.id = avatar_likes.avatar_id AND g.is_public
    )
  );

DROP POLICY IF EXISTS "avatar_likes_delete_own" ON public.avatar_likes;
CREATE POLICY "avatar_likes_delete_own"
  ON public.avatar_likes
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.avatar_likes TO authenticated;
GRANT SELECT ON public.avatar_likes TO anon;


-- like_count を avatar_likes の実数と同期させる
CREATE OR REPLACE FUNCTION public.sync_avatar_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.avatar_gallery
       SET like_count = like_count + 1
     WHERE id = NEW.avatar_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.avatar_gallery
       SET like_count = GREATEST(like_count - 1, 0)
     WHERE id = OLD.avatar_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_avatar_likes_sync_count ON public.avatar_likes;
CREATE TRIGGER trg_avatar_likes_sync_count
  AFTER INSERT OR DELETE ON public.avatar_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_avatar_like_count();


-- ---------------------------------------------------------
-- 4. 公開の切り替え
--    非公開に戻したときは、そのアバターへのいいねを消して
--    like_count を 0 に戻す（再公開時に古い数字が残らないようにする）。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_avatar_visibility(
  _avatar_id uuid,
  _is_public boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO _owner FROM public.avatar_gallery WHERE id = _avatar_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Avatar not found';
  END IF;
  IF _owner <> _uid THEN
    RAISE EXCEPTION 'Only the owner can change visibility';
  END IF;

  IF NOT _is_public THEN
    DELETE FROM public.avatar_likes WHERE avatar_id = _avatar_id;
  END IF;

  UPDATE public.avatar_gallery
     SET is_public = _is_public
   WHERE id = _avatar_id;

  RETURN _is_public;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_avatar_visibility(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_avatar_visibility(uuid, boolean) TO authenticated;


-- ---------------------------------------------------------
-- 5. いいねの切り替え
--    RLS だけでも守れるが、往復を1回に抑えるため RPC にする。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_avatar_like(_avatar_id uuid)
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

  SELECT is_public INTO _is_public FROM public.avatar_gallery WHERE id = _avatar_id;
  IF _is_public IS NULL THEN
    RAISE EXCEPTION 'Avatar not found';
  END IF;
  IF NOT _is_public THEN
    RAISE EXCEPTION 'Avatar is not public';
  END IF;

  DELETE FROM public.avatar_likes
   WHERE avatar_id = _avatar_id AND user_id = _uid;

  IF FOUND THEN
    _liked := false;
  ELSE
    INSERT INTO public.avatar_likes (avatar_id, user_id) VALUES (_avatar_id, _uid);
    _liked := true;
  END IF;

  SELECT like_count INTO _count FROM public.avatar_gallery WHERE id = _avatar_id;

  RETURN jsonb_build_object('liked', _liked, 'like_count', COALESCE(_count, 0));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.toggle_avatar_like(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_avatar_like(uuid) TO authenticated;
