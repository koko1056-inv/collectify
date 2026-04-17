import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoginFormData } from "@/types/auth";
import { handleAdminLogin, handleUserLogin, handleUserSignup } from "@/utils/auth";

export function useLoginForm() {
  const [searchParams] = useSearchParams();
  const inviteCodeFromUrl = searchParams.get("invite")?.toUpperCase() || "";
  // URLに招待コードがあれば、初期状態をサインアップモードにする
  const [isLogin, setIsLogin] = useState(!inviteCodeFromUrl);
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });

  // セッションストレージに招待コードを保存（サインアップ完了後にredeem）
  useEffect(() => {
    if (inviteCodeFromUrl) {
      sessionStorage.setItem("pending_invite_code", inviteCodeFromUrl);
    }
  }, [inviteCodeFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // ユーザー名に関係なく通常のログイン処理を実行
        // 管理者かどうかはログイン後にuser_rolesテーブルで判定
        await handleUserLogin(formData);
        
        // ログイン後に管理者ロールを確認
        const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
        if (user) {
          const { data: isAdmin } = await (await import("@/integrations/supabase/client")).supabase
            .rpc('has_role', { _user_id: user.id, _role: 'admin' });
          
          if (isAdmin) {
            navigate("/admin");
          } else {
            navigate("/");
          }
        } else {
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
    inviteCode,
    setInviteCode,
    hasInviteFromUrl: !!inviteCodeFromUrl,
  };
}