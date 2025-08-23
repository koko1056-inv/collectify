-- admin_accountsテーブルのセキュリティ脆弱性を修正（ポリシー存在チェック付き）

-- 1) 既存ポリシーの確認と削除
DO $$
BEGIN
  -- 危険な「誰でも閲覧可能」なSELECTポリシーがあれば削除
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_accounts' AND policyname = 'Allow public read access'
  ) THEN
    DROP POLICY "Allow public read access" ON public.admin_accounts;
  END IF;

  -- 既に安全なポリシーが存在するかチェック
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_accounts' AND policyname = 'Only admins can view admin accounts'
  ) THEN
    -- 既存のポリシーを一旦削除して再作成
    DROP POLICY "Only admins can view admin accounts" ON public.admin_accounts;
  END IF;
END $$;

-- 2) 管理者のみが管理者アカウント情報を閲覧可能な安全なポリシーを作成
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

-- この修正により：
-- - 攻撃者は管理者アカウントのIDを特定できなくなります
-- - 管理者のみが管理者アカウント情報にアクセス可能になります
-- - 標的型攻撃のリスクが大幅に軽減されます