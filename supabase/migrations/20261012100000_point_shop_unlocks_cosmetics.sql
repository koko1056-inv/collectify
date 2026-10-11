-- =========================================================
-- ポイントの使い道を増やす: 着せ替え（見せる楽しさ）を「永久に解放」するしくみ（1/4: 器）
--
-- 方針:
--   - 有利不利が生まれるものは売らない（pay-to-win にしない）。見た目だけ。
--   - 解放は user_unlocks に1行（user_id, unlock_key）。買い切りで、二重購入はできない。
--   - いま身に付けているものは profiles の公開列（profile_cover_key / avatar_frame_key /
--     profile_oshi_color）に置く。プロフィールを見られる人（profiles の RLS と同じ範囲）には、
--     そのまま見える。持っていないものを付けられないよう、次のマイグレーションのトリガーで確かめる。
-- =========================================================

-- 解放アイテムが何を解放するか（例: 'cover:starry'）
ALTER TABLE public.point_shop_items ADD COLUMN IF NOT EXISTS unlock_key text;

CREATE UNIQUE INDEX IF NOT EXISTS point_shop_items_unlock_key_unique
  ON public.point_shop_items (unlock_key) WHERE unlock_key IS NOT NULL;

-- 解放済みの記録。本人だけが読める。書き込みは purchase_shop_item（SECURITY DEFINER）だけ。
CREATE TABLE IF NOT EXISTS public.user_unlocks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unlock_key)
);

ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_unlocks_select_own" ON public.user_unlocks
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE のポリシーは作らない（購入 RPC 経由のみ）

-- 身に付けている着せ替え
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_cover_key text,
  ADD COLUMN IF NOT EXISTS avatar_frame_key text,
  ADD COLUMN IF NOT EXISTS profile_oshi_color text;
