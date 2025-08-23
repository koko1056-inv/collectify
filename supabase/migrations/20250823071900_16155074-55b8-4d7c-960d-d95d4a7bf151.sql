-- admin_accountsテーブルのセキュリティ脆弱性を修正
-- 現在の「誰でも閲覧可能」なSELECTポリシーを削除し、管理者のみに制限

-- 1) 危険な「誰でも閲覧可能」なSELECTポリシーを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_accounts' AND policyname = 'Allow public read access'
  ) THEN
    DROP POLICY "Allow public read access" ON public.admin_accounts;
  END IF;
END $$;

-- 2) 管理者のみが管理者アカウント情報を閲覧可能な新しいポリシーを作成
-- セキュリティ上、管理者アカウントの情報は管理者のみが閲覧すべき
CREATE POLICY "Only admins can view admin accounts"
ON public.admin_accounts
FOR SELECT
TO authenticated
USING (
  -- 現在のユーザーが管理者アカウントテーブルに存在する場合のみ閲覧可能
  auth.uid() IN (
    SELECT id FROM public.admin_accounts
  )
);

-- 注意：この変更により、管理者以外のユーザーは管理者アカウント情報を
-- 閲覧できなくなります。これにより攻撃者が管理者を特定して
-- 標的型攻撃を行うリスクを軽減できます。