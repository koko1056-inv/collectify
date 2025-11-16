-- profilesテーブルのSELECTポリシーを修正
-- 基本情報（username, avatar_url）は誰でも見られるようにする
DROP POLICY IF EXISTS "Profiles view with strict privacy controls" ON profiles;

-- 認証済みユーザーは他のユーザーの基本情報を閲覧できる
CREATE POLICY "Authenticated users can view profiles"
ON profiles
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);