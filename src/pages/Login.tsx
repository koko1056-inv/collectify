import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "ログイン成功",
          description: "ようこそ戻ってきました！",
        });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Check for user_already_exists error
          if (error.message.includes("user_already_exists")) {
            toast({
              title: "登録済みのメールアドレス",
              description: "このメールアドレスは既に登録されています。ログインをお試しください。",
              variant: "destructive",
            });
            setIsLogin(true); // Switch to login mode
            return;
          }
          throw error;
        }

        toast({
          title: "登録完了",
          description: "確認メールをお送りしました。メールを確認してアカウントを有効化してください。",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "認証エラーが発生しました",
        variant: "destructive",
      });
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
              onClick={() => setIsLogin(!isLogin)}
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