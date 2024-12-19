import { useState } from "react";
import { validateEmail, validatePassword } from "@/utils/validation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  email: string;
  password: string;
}

export function useLoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
      return false;
    }
    if (!validateEmail(formData.email)) {
      setError("有効なメールアドレスを入力してください");
      return false;
    }
    if (!validatePassword(formData.password)) {
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
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          if (signInError.message.includes("Invalid login credentials")) {
            setError("メールアドレスまたはパスワードが正しくありません");
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) {
          console.error("Sign up error:", signUpError);
          if (signUpError.message.includes("User already registered")) {
            setError("このメールアドレスは既に登録されています。ログインをお試しください。");
            setIsLogin(true);
            return;
          }
          throw signUpError;
        }

        if (data.user) {
          toast({
            title: "登録完了",
            description: "確認メールをお送りしました。メールを確認してアカウントを有効化してください。",
          });
        }
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
    setFormData({ email: "", password: "" });
  };

  return {
    isLogin,
    loading,
    error,
    formData,
    showPasswordRequirements,
    setFormData,
    setShowPasswordRequirements,
    handleSubmit,
    toggleMode,
    validateEmail,
    validatePassword,
  };
}