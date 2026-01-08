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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile?.is_admin) {
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

  return data;
};

export const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error);
    throw new Error("ログアウトに失敗しました");
  }
};