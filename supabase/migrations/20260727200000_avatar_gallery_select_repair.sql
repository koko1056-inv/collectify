-- =========================================================
-- avatar_gallery の SELECT ポリシーを確実に存在させる（冪等）
--
-- 20260727180000_avatar_explore.sql は
--   1. is_public 列の追加
--   2. 旧 SELECT ポリシーの DROP
--   3. 新 SELECT ポリシーの CREATE
-- をこの順で行う。トランザクション外で 2 と 3 の間で止まると、
-- SELECT ポリシーが1つも無い状態になり、本人でも自分のアバターが
-- 見えなくなる。その状態を無条件に修復する。
--
-- すべて IF NOT EXISTS / DROP ... IF EXISTS なので、
-- 正常に適用済みの環境で再実行しても何も壊さない。
-- =========================================================

ALTER TABLE public.avatar_gallery
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.avatar_gallery
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "avatar_gallery_select" ON public.avatar_gallery;
CREATE POLICY "avatar_gallery_select"
  ON public.avatar_gallery
  FOR SELECT
  USING (auth.uid() = user_id OR is_public);

-- 本人の更新・削除も、念のため存在を保証しておく
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
