-- 公式アイテムのタグ管理を改善するため、RLSポリシーを更新
-- 認証されたユーザーなら誰でもタグの追加・削除・更新ができるようにする

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can delete their own item tags" ON item_tags;
DROP POLICY IF EXISTS "Users can update their own item tags" ON item_tags;

-- 新しいポリシーを作成（認証されたユーザーなら誰でも可能）
CREATE POLICY "Authenticated users can delete item tags"
ON item_tags FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update item tags"
ON item_tags FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);