-- tagsテーブルのRLSポリシーを更新
-- 既存のINSERTポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow authenticated users to insert tags" ON tags;
DROP POLICY IF EXISTS "Users can insert tags" ON tags;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tags;

-- 認証されたユーザーがタグを挿入できるようにする
CREATE POLICY "Enable insert for authenticated users"
ON tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 既存のSELECTポリシーを確認し、なければ追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tags' 
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
    ON tags
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;