import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  username: string;
  password: string;
}

export function useLoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  });

  const validateForm = () => {
    if (!formData.username || !formData.password) {
      setError("ユーザー名とパスワードを入力してください");
      return false;
    }
    if (formData.password.length < 6) {
      setError("パスワードは6文字以上である必要があります");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        // For admin login
        if (formData.username === 'admin') {
          const { data: adminProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', 'admin')
            .maybeSingle();

          if (profileError) {
            throw new Error("管理者アカウントの検索中にエラーが発生しました");
          }

          if (!adminProfile || !adminProfile.is_admin) {
            throw new Error("管理者権限がありません");
          }

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@example.com',
            password: formData.password,
          });

          if (signInError) {
            throw new Error("ユーザー名またはパスワードが正しくありません");
          }

          toast({
            title: "ログイン成功",
            description: "ようこそ戻ってきました！",
          });
          navigate("/admin");
          return;
        }

        // For regular users
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username)
          .maybeSingle();

        if (profileError) {
          throw new Error("ユーザー情報の検索中にエラーが発生しました");
        }

        if (!profile) {
          throw new Error("ユーザー名が見つかりません");
        }

        const userEmail = `${profile.id}@example.com`;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: formData.password,
        });

        if (signInError) {
          throw new Error("ユーザー名またはパスワードが正しくありません");
        }

        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
        navigate("/");
      } else {
        // For signup
        const { data: existingUser, error: existingUserError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', formData.username)
          .maybeSingle();

        if (existingUserError) {
          throw new Error("ユーザー名の確認中にエラーが発生しました");
        }

        if (existingUser) {
          throw new Error("このユーザー名は既に使用されています");
        }

        const randomEmail = `${crypto.randomUUID()}@example.com`;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: randomEmail,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
            },
          },
        });

        if (signUpError) {
          throw new Error("アカウント作成中にエラーが発生しました");
        }

        // Wait for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast({
          title: "登録完了",
          description: "アカウントが作成されました。ログインしてください。",
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error instanceof Error ? error.message : "認証エラーが発生しました。しばらく経ってからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData({ username: "", password: "" });
  };

  return {
    isLogin,
    loading,
    error,
    formData,
    setFormData,
    handleSubmit,
    toggleMode,
  };
}