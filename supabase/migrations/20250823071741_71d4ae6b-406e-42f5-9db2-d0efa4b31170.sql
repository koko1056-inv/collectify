-- followsテーブルのセキュリティ脆弱性を修正
-- 現在の「誰でも閲覧可能」なSELECTポリシーを削除し、関係者のみに制限

-- 1) 既存の危険なSELECTポリシー（誰でも閲覧可能）を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'follows' AND policyname = 'Users can view follows'
  ) THEN
    DROP POLICY "Users can view follows" ON public.follows;
  END IF;
END $$;

-- 2) 新しいSELECTポリシー（関係者のみ閲覧可能）を作成
-- フォロワー本人またはフォローされている本人のみがその関係を閲覧可能
CREATE POLICY "Users can view their own follow relationships"
ON public.follows
FOR SELECT
TO authenticated
USING (
  -- 自分がフォロワーである関係
  auth.uid() = follower_id
  OR
  -- 自分がフォローされている関係
  auth.uid() = following_id
);

-- 3) 既存のALLポリシーも確認・修正（フォロー/アンフォローは自分のみ可能）
-- 「Users can follow/unfollow others」が既に適切に設定されているが、念のため確認
-- このポリシーは auth.uid() = follower_id となっているので、自分のフォロー操作のみ許可されている

-- 注意：この変更により、第三者がフォロー関係を閲覧することはできなくなります
-- アプリケーション側で「○○さんをフォローしている人一覧」などの機能がある場合は、
-- プライバシー設定に応じた追加の制御が必要になる可能性があります