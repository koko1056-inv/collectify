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
  // First, check if the user exists in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', formData.username)
    .single();

  if (profileError) {
    console.error("Profile lookup error:", profileError);
    throw new Error("ユーザー名が見つかりません");
  }

  // Generate a consistent email format for the user
  const email = `${formData.username}@example.com`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
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
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .single();

  if (existingProfile) {
    throw new Error("このユーザー名は既に使用されています");
  }

  // Generate a consistent email format for the user
  const email = `${formData.username}@example.com`;

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