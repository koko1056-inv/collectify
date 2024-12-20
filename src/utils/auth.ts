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
  const email = `${formData.username.toLowerCase()}@example.com`;
  console.log("Attempting login for user:", formData.username);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .maybeSingle();

  if (!profile) {
    throw new Error("ユーザーが見つかりません");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.password,
  });

  if (error) {
    console.error("Login error:", error);
    throw new Error("ログインに失敗しました。パスワードを確認してください。");
  }

  return data;
};

export const handleUserSignup = async (formData: LoginFormData) => {
  const email = `${formData.username.toLowerCase()}@example.com`;
  console.log("Creating new user:", formData.username);

  // Check if username is already taken
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("このユーザー名は既に使用されています");
  }

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