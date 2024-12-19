import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { useLoginForm } from "@/hooks/useLoginForm";

export default function Login() {
  const {
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
  } = useLoginForm();

  return (
    <div className="min-h-screen bg-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? "ログイン" : "新規登録"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "アカウントにログインしてコレクションを管理"
              : "新規アカウントを作成してコレクションを始めましょう"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="your@email.com"
                className={!validateEmail(formData.email) && formData.email ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                required
                placeholder="••••••"
                className={!validatePassword(formData.password) && formData.password ? "border-destructive" : ""}
              />
              {showPasswordRequirements && (
                <PasswordRequirements password={formData.password} />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "処理中..." : isLogin ? "ログイン" : "アカウント作成"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={toggleMode}
              className="w-full"
              disabled={loading}
            >
              {isLogin
                ? "アカウントをお持ちでない方はこちら"
                : "すでにアカウントをお持ちの方はこちら"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}