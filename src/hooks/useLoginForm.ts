import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoginFormData } from "@/types/auth";
import { validateLoginForm } from "@/utils/validation";
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

    const validationError = validateLoginForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    console.log("Starting authentication process for:", formData.username);

    try {
      if (isLogin) {
        if (formData.username === 'admin') {
          console.log("Attempting admin login");
          await handleAdminLogin(formData.password);
          toast({
            title: "ログイン成功",
            description: "ようこそ戻ってきました！",
          });
          navigate("/admin");
          return;
        }

        console.log("Attempting regular user login");
        await handleUserLogin(formData);
        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
        navigate("/");
      } else {
        console.log("Attempting user signup");
        await handleUserSignup(formData);
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