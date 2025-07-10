-- 既存のポリシーをすべて削除してから新しいものを作成
DROP POLICY IF EXISTS "Users can delete their own item tags" ON item_tags;
DROP POLICY IF EXISTS "Users can update their own item tags" ON item_tags;
DROP POLICY IF EXISTS "Authenticated users can delete item tags" ON item_tags;
DROP POLICY IF EXISTS "Authenticated users can update item tags" ON item_tags;

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