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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${formData.username}@example.com`,
          password: formData.password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            setError("ユーザー名またはパスワードが正しくありません");
            return;
          }
          throw signInError;
        }

        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
        navigate("/");
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: `${formData.username}@example.com`,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("User already registered")) {
            setError("このユーザー名は既に使用されています");
            setIsLogin(true);
            return;
          }
          throw signUpError;
        }

        toast({
          title: "登録完了",
          description: "アカウントが作成されました。ログインしてください。",
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError("認証エラーが発生しました。しばらく経ってからもう一度お試しください。");
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