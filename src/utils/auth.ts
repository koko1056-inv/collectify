import { supabase } from "@/integrations/supabase/client";
import { LoginFormData } from "@/types/auth";

export const handleAdminLogin = async (password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password,
  });

  if (error) {
    console.error("Admin login error:", error);
    throw new Error("管理者ログインに失敗しました");
  }

  // user_rolesテーブルでadminロールを確認（has_role関数を使用）
  const { data: roleCheck, error: roleError } = await supabase
    .rpc('has_role', { _user_id: data.user.id, _role: 'admin' });

  if (roleError || !roleCheck) {
    await supabase.auth.signOut();
    throw new Error("管理者権限がありません");
  }

  return data;
};

export const handleUserLogin = async (formData: LoginFormData) => {
  // Generate a consistent email format for the user
  const email = `${formData.username}@example.com`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.password,
  });

  if (error) {
    console.error("Login error:", error);
    throw new Error("ユーザー名またはパスワードが正しくありません");
  }

  // After successful login, verify the profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', formData.username)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Profile verification error:", profileError);
    // Sign out if profile doesn't exist
    await supabase.auth.signOut();
    throw new Error("ユーザープロフィールが見つかりません");
  }

  return data;
};

export const handleUserSignup = async (formData: LoginFormData) => {
  // Validate username - only allow alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(formData.username)) {
    throw new Error("ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます");
  }

  if (formData.username.length < 3 || formData.username.length > 20) {
    throw new Error("ユーザー名は3〜20文字で入力してください");
  }

  // Check if username is already taken
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .maybeSingle();

  if (checkError) {
    console.error("Profile check error:", checkError);
    throw new Error("ユーザー名の確認に失敗しました");
  }

  if (existingProfile) {
    throw new Error("このユーザー名は既に使用されています");
  }

  // Generate a consistent email format for the user
  const email = `${formData.username.toLowerCase()}@example.com`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.password,
    options: {
      data: {
        username: formData.username,
      },
    },
  });

  if (error) {
    console.error("Signup error:", error);
    throw new Error("アカウント作成に失敗しました");
  }

  // Wait for the profile creation trigger
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Track signup event
  if (data.user) {
    const { trackSignup } = await import("./analytics");
    trackSignup(data.user.id, "email");

    // 招待コードがあれば適用
    const pendingInvite = sessionStorage.getItem("pending_invite_code");
    if (pendingInvite) {
      try {
        const { data: invite } = await supabase
          .from("invite_codes")
          .select("*")
          .eq("code", pendingInvite)
          .is("used_by", null)
          .maybeSingle();

        if (invite && invite.creator_id !== data.user.id) {
          await supabase
            .from("invite_codes")
            .update({ used_by: data.user.id, used_at: new Date().toISOString() })
            .eq("id", invite.id);

          await supabase
            .from("profiles")
            .update({ referred_by: invite.creator_id })
            .eq("id", data.user.id);

          // 双方に50ポイント (RPC経由でuser_pointsと原子的に同期)
          await supabase.rpc("add_user_points", {
            _user_id: invite.creator_id,
            _points: 50,
            _transaction_type: "referral_bonus",
            _description: "招待ボーナス",
            _reference_id: invite.id,
          });
          await supabase.rpc("add_user_points", {
            _user_id: data.user.id,
            _points: 50,
            _transaction_type: "referral_bonus",
            _description: "招待コード使用ボーナス",
            _reference_id: invite.id,
          });
        }
      } catch (err) {
        console.error("Invite redemption failed:", err);
      } finally {
        sessionStorage.removeItem("pending_invite_code");
      }
    }
  }

  return data;
};

export const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error);
    throw new Error("ログアウトに失敗しました");
  }
};