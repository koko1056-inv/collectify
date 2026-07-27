import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, Lock } from "lucide-react";
import { useLoginForm } from "@/hooks/useLoginForm";
import { PasswordReset } from "@/components/PasswordReset";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/my-room";
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
    <div className="min-h-screen bg-accent/5 flex items-center justify-center p-4">
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
        <form onSubmit={handleSubmit}>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
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
              onClick={toggleMode}
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
