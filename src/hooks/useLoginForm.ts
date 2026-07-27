import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LoginFormData } from "@/types/auth";
import { handleAdminLogin, handleUserLogin, handleUserSignup } from "@/utils/auth";
import { useLanguage } from "@/contexts/LanguageContext";

export function useLoginForm() {
  const [searchParams] = useSearchParams();
  const inviteCodeFromUrl = searchParams.get("invite")?.toUpperCase() || "";
  // ログイン/登録後に戻る先（リッチメニューで開いた画面など）。無ければルートへ。
  const redirectTo = searchParams.get("redirect") || "/";
  // URLに招待コードがあれば、初期状態をサインアップモードにする
  const [isLogin, setIsLogin] = useState(!inviteCodeFromUrl);
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl);
  const navigate = useNavigate();
  const { t } = useLanguage();
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
            navigate(redirectTo);
          }
        } else {
          navigate(redirectTo);
        }
        
        toast.success(t("notices.auth.loginSuccessTitle"), {
          description: t("notices.auth.loginSuccessDesc"),
        });
      } else {
        await handleUserSignup(formData);
        // signUp は自動確認設定ならそのままセッションが張られる（＝ログイン済み）。
        // その場合「ログインしてください」と出すと矛盾するため文言を分ける。
        const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
        if (session) {
          toast.success(t("notices.auth.signupDoneTitle"), {
            description: t("notices.auth.signupWelcomeDesc"),
          });
          navigate(redirectTo);
        } else {
          toast.success(t("notices.auth.signupDoneTitle"), {
            description: t("notices.auth.signupThenLoginDesc"),
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error instanceof Error ? error.message : t("notices.auth.genericError"));
      toast.error(t("notices.common.errorTitle"), {
        description: error instanceof Error ? error.message : t("notices.auth.genericError"),
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