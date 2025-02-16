
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // 管理者ログインの場合はusernameのチェックをスキップ
        if (formData.username === 'admin1122') {
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
