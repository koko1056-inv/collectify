import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
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
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
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
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast({
              title: "アカウントが既に存在します",
              description: "ログインに切り替えます",
            });
            setIsLogin(true);
            return;
          }
          throw signUpError;
        }

        toast({
          title: "登録完了",
          description: "確認メールをお送りしました。メールを確認してアカウントを有効化してください。",
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "認証エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

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
                required
                placeholder="••••••"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "処理中..." : isLogin ? "ログイン" : "アカウント作成"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
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