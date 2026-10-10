import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, Lock, Globe } from "lucide-react";
import { useLoginForm } from "@/hooks/useLoginForm";
import { PasswordReset } from "@/components/PasswordReset";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { t, language, setLanguage } = useLanguage();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  // 新規登録には利用規約とプライバシーポリシーへの同意が要る（ログインでは出さない）
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/collection";
  const { user, loading: authLoading } = useAuth();
  const {
    isLogin,
    loading,
    error,
    formData,
    setFormData,
    handleSubmit,
    toggleMode,
  } = useLoginForm();

  const needsAgreement = !isLogin && !agreed;

  const onSubmit = (e: React.FormEvent) => {
    if (needsAgreement) {
      e.preventDefault();
      return;
    }
    handleSubmit(e);
  };

  // AuthContext の状態のみ使用（直接 Supabase 購読は二重購読でループの原因になる）
  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t("screens.login.resetTitle")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("screens.login.resetDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordReset onBack={() => setShowPasswordReset(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-accent/5 flex flex-col items-center justify-center gap-6 p-4">
      {/* 言語の切り替え（英語の端末では最初から英語で出るので、日本語に戻せるように） */}
      <button
        type="button"
        onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {language === "ja" ? "English" : "日本語"}
      </button>
      {/* 何のアプリかが分かるように、ロゴと1行の説明を置く */}
      <div className="text-center">
        <p className="logo-text text-4xl text-brand-gradient">Collectify</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("screens.login.tagline")}</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t("screens.login.welcome")}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? t("screens.login.subtitleLogin")
              : t("screens.login.subtitleSignup")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  placeholder={t("screens.login.usernamePlaceholder")}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder={t("screens.login.passwordPlaceholder")}
                  className="pl-10"
                />
              </div>
            </div>
            {!isLogin && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <Checkbox
                  id="agree-terms"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                  aria-label={t("safety.agree.label")}
                />
                <label htmlFor="agree-terms" className="text-xs leading-relaxed text-muted-foreground">
                  {t("safety.agree.before")}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {t("safety.agree.terms")}
                  </Link>
                  {t("safety.agree.and")}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {t("safety.agree.privacy")}
                  </Link>
                  {t("safety.agree.after")}
                </label>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || needsAgreement}
              size="lg"
            >
              {loading ? t("screens.login.processing") : isLogin ? t("screens.login.loginButton") : t("screens.login.signupButton")}
            </Button>
            {isLogin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPasswordReset(true)}
                className="w-full text-sm"
              >
                {t("screens.login.forgotPassword")}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAgreed(false);
                toggleMode();
              }}
              className="w-full text-sm"
              disabled={loading}
            >
              {isLogin
                ? t("screens.login.toSignup")
                : t("screens.login.toLogin")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
