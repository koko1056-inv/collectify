import { supabase } from "@/integrations/supabase/client";
import { LoginFormData } from "@/types/auth";

export const handleAdminLogin = async (password: string) => {
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'admin')
    .maybeSingle();

  if (profileError) {
    console.error("Admin profile lookup error:", profileError);
    throw new Error("管理者アカウントの検索中にエラーが発生しました");
  }

  if (!adminProfile || !adminProfile.is_admin) {
    throw new Error("管理者権限がありません");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password,
  });

  if (signInError) {
    console.error("Admin login error:", signInError);
    throw new Error("ユーザー名またはパスワードが正しくありません");
  }
};

export const handleUserLogin = async (formData: LoginFormData) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);
    throw new Error("ユーザー情報の検索中にエラーが発生しました");
  }

  if (!profile) {
    throw new Error("ユーザー名が見つかりません");
  }

  const userEmail = `${formData.username.toLowerCase()}@example.com`;
  console.log("Using email for auth:", userEmail);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: formData.password,
  });

  if (signInError) {
    console.error("Sign in error:", signInError);
    throw new Error("ユーザー名またはパスワードが正しくありません");
  }
};

export const handleUserSignup = async (formData: LoginFormData) => {
  const { data: existingUser, error: existingUserError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', formData.username)
    .maybeSingle();

  if (existingUserError && existingUserError.code !== 'PGRST116') {
    console.error("Username check error:", existingUserError);
    throw new Error("ユーザー名の確認中にエラーが発生しました");
  }

  if (existingUser) {
    throw new Error("このユーザー名は既に使用されています");
  }

  const userEmail = `${formData.username.toLowerCase()}@example.com`;
  console.log("Using email for signup:", userEmail);
  
  const { error: signUpError } = await supabase.auth.signUp({
    email: userEmail,
    password: formData.password,
    options: {
      data: {
        username: formData.username,
      },
    },
  });

  if (signUpError) {
    console.error("Signup error:", signUpError);
    throw new Error("アカウント作成中にエラーが発生しました");
  }

  // Wait for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1000));
};