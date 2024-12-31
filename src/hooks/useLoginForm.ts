import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoginFormData } from "@/types/auth";
import { handleAdminLogin, handleUserLogin, handleUserSignup } from "@/utils/auth";

export function useLoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });

  const validateUsername = (username: string) => {
    if (!username) return "ユーザー名を入力してください";
    if (username.length < 3) return "ユーザー名は3文字以上である必要があります";
    if (username.length > 20) return "ユーザー名は20文字以下である必要があります";
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return "ユーザー名は英数字とアンダースコアのみ使用できます";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isLogin) {
        const usernameError = validateUsername(formData.username);
        if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        if (formData.username === 'admin') {
          await handleAdminLogin(formData.password);
          navigate("/admin");
        } else {
          await handleUserLogin(formData);
          navigate("/");
        }
        
        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
      } else {
        await handleUserSignup(formData);
        toast({
          title: "登録完了",
          description: "アカウントが作成されました。ログインしてください。",
        });
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error instanceof Error ? error.message : "認証エラーが発生しました");
      toast({
        variant: "destructive",
        title: "エラー",
        description: error instanceof Error ? error.message : "認証エラーが発生しました",
      });
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