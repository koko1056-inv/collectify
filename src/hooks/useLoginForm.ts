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
          console.log("Attempting admin login...");
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@example.com',
            password: formData.password,
          });

          if (signInError) {
            console.error("Admin login error:", signInError);
            throw new Error("ユーザー名またはパスワードが正しくありません");
          }

          toast({
            title: "ログイン成功",
            description: "ようこそ戻ってきました！",
          });
          navigate("/");
          return;
        }

        // For regular users
        console.log("Attempting regular user login...");
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username)
          .single();

        if (profileError) {
          console.error("Profile lookup error:", profileError);
          throw new Error("ユーザー名が見つかりません");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${profiles.id}@example.com`,
          password: formData.password,
        });

        if (signInError) {
          console.error("User login error:", signInError);
          throw new Error("ユーザー名またはパスワードが正しくありません");
        }

        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
        navigate("/");
      } else {
        // For signup
        console.log("Attempting user signup...");
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${crypto.randomUUID()}@example.com`,
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

        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', formData.username)
          .single();

        if (existingUser) {
          throw new Error("このユーザー名は既に使用されています");
        }

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