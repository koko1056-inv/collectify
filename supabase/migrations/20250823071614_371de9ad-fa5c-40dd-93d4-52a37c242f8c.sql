-- 1) 安全にenumを作成（存在チェック）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_privacy') THEN
    CREATE TYPE public.profile_privacy AS ENUM ('public', 'followers', 'private');
  END IF;
END $$;

-- 2) カラム追加（まずはNULL許容＋デフォルト）、既存行を埋めてからNOT NULL制約を付与
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_level public.profile_privacy DEFAULT 'public';

UPDATE public.profiles
SET privacy_level = 'public'
WHERE privacy_level IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN privacy_level SET NOT NULL;

-- 3) フォロワー判定関数（RLSで使用）
CREATE OR REPLACE FUNCTION public.is_follower(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.follows f
    WHERE f.follower_id = auth.uid()
      AND f.following_id = target_user_id
  );
$$;

-- 4) 既存の「誰でも閲覧可」なSELECTポリシーを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Authenticated users can view profiles'
  ) THEN
    DROP POLICY "Authenticated users can view profiles" ON public.profiles;
  END IF;
END $$;

-- 5) 新しいSELECTポリシー（認証ユーザー限定、プライバシー/関係に基づく）
CREATE POLICY "Profiles view based on privacy and relationships"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- 自分のプロフィールは常に閲覧可
  id = auth.uid()
  OR
  -- 公開プロフィール
  privacy_level = 'public'
  OR
  -- フォロワー限定（フォロワーであれば閲覧可）
  (privacy_level = 'followers' AND public.is_follower(id))
);

-- 6) 参考：その他のUPDATE系ポリシーはそのまま（既存のまま）
--    Users can update their own profile / interests / favorite items などを維持

-- 7) パフォーマンス最適化：followsのインデックス（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'follows' AND indexname = 'idx_follows_follower_following'
  ) THEN
    CREATE INDEX idx_follows_follower_following
      ON public.follows (follower_id, following_id);
  END IF;
END $$;