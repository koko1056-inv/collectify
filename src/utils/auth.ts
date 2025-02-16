import { supabase } from "@/integrations/supabase/client";
import { LoginFormData } from "@/types/auth";

export const handleAdminLogin = async (username: string, password: string) => {
  try {
    // ユーザー名が管理者のものかチェック
    if (username !== 'koko11221056') {
      throw new Error("管理者アカウントではありません");
    }

    // 認証情報を確認
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,  // メールアドレス形式を使用しない
      password,
    });

    if (error) {
      console.error("Admin login error details:", error);
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("管理者アカウントのパスワードが正しくありません");
      }
      throw new Error("管理者ログインに失敗しました");
    }

    console.log("Admin login successful:", data);

    // 管理者権限の確認
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .single();

    console.log("Admin profile check:", { profile, profileError });

    if (profileError || !profile?.is_admin) {
      await supabase.auth.signOut();
      throw new Error("管理者権限がありません");
    }

    return data;
  } catch (error) {
    console.error("Admin login failed:", error);
    throw error;
  }
};

export const handleUserLogin = async (formData: LoginFormData) => {
  // First, check if the user exists in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', formData.username)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);
    throw new Error("プロフィールの取得に失敗しました");
  }

  if (!profile) {
    throw new Error("ユーザー名が見つかりません");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.username,
    password: formData.password,
  });

  if (error) {
    console.error("Login error:", error);
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("パスワードが正しくありません");
    }
    throw new Error("ログインに失敗しました");
  }

  return data;
};

export const handleUserSignup = async (formData: LoginFormData) => {
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

  const { data, error } = await supabase.auth.signUp({
    email: formData.username,
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

  return data;
};

export const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error);
    throw new Error("ログアウトに失敗しました");
  }
};
