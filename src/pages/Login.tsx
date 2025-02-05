import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, Lock } from "lucide-react";
import { useLoginForm } from "@/hooks/useLoginForm";
import { PasswordReset } from "@/components/PasswordReset";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isLogin,
    loading,
    error,
    formData,
    setFormData,
    handleSubmit,
    toggleMode,
  } = useLoginForm();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          navigate("/");
        }
      } catch (error) {
        console.error("Session check error:", error);
        toast({
          variant: "destructive",
          title: "エラーが発生しました",
          description: "セッションの確認中にエラーが発生しました。",
        });
      }
    };
    
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              パスワードをお忘れですか？
            </CardTitle>
            <CardDescription className="text-center">
              登録したメールアドレスを入力してください。
              パスワードリセット用のリンクをお送りします。
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
            Collectifyにようこそ
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
                  placeholder="ユーザー名"
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
                  placeholder="パスワード"
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
              {loading ? "処理中..." : isLogin ? "ログイン" : "アカウント作成"}
            </Button>
            {isLogin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPasswordReset(true)}
                className="w-full text-sm"
              >
                パスワードをお忘れの方はこちら
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
                ? "アカウントをお持ちでない方はこちら"
                : "すでにアカウントをお持ちの方はこちら"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}