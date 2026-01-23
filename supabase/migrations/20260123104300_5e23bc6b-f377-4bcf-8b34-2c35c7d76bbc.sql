-- 1. 先に依存ポリシーを削除
DROP POLICY IF EXISTS "Enable delete for admins" ON official_items;
DROP POLICY IF EXISTS "Users can delete their own official items" ON official_items;

-- 2. admin_accountsテーブルのRLSポリシーを削除
DROP POLICY IF EXISTS "Restricted admin accounts access" ON admin_accounts;
DROP POLICY IF EXISTS "Restricted admin accounts insert" ON admin_accounts;

-- 3. 既存のadmin_accountsユーザーをuser_rolesに移行
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM admin_accounts
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. admin_accountsテーブルを削除
DROP TABLE IF EXISTS admin_accounts;

-- 5. official_itemsの削除ポリシーを再作成（has_role関数を使用）
CREATE POLICY "Admins can delete official items"
ON official_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can delete own official items"
ON official_items FOR DELETE
USING (auth.uid() = created_by);

-- 6. profilesテーブルのRLSポリシーを改善
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner or if public" ON profiles;

-- 自分のプロフィールは常に見れる
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 公開プロフィールは誰でも見れる
CREATE POLICY "Public profiles are viewable"
ON profiles FOR SELECT
USING (privacy_level = 'public'::profile_privacy);

-- フォロワー限定プロフィールはフォロワーのみ
CREATE POLICY "Followers can view follower-only profiles"
ON profiles FOR SELECT
USING (
  privacy_level = 'followers'::profile_privacy 
  AND is_follower(id)
);

-- 7. user_rolesテーブルのRLSポリシーを追加
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));