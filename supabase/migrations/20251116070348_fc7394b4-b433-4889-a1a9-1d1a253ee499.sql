-- profilesとuser_itemsのSELECTポリシーを誰でも閲覧可能に変更
-- これにより投稿一覧でユーザー名とアイテム情報が正しく表示されます

-- profilesの既存ポリシーを削除して新規作成
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Anyone can view basic profile info"
ON profiles
FOR SELECT
TO public
USING (true);

-- user_itemsの既存ポリシーを確認して修正
DROP POLICY IF EXISTS "Users can view other users items" ON user_items;

CREATE POLICY "Anyone can view user items"
ON user_items
FOR SELECT
TO public
USING (true);