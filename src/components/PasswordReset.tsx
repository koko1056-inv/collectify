import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) {
        console.error("Password reset error:", error);
        throw error;
      }

      toast({
        title: "メール送信完了",
        description: "パスワードリセット用のメールを送信しました。メールをご確認ください。",
      });
      onBack();
    } catch (error) {
      setError("パスワードリセットメールの送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="メールアドレス"
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex flex-col space-y-4">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "送信中..." : "パスワードリセットメールを送信"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full"
          disabled={loading}
        >
          ログイン画面に戻る
        </Button>
      </div>
    </form>
  );
}