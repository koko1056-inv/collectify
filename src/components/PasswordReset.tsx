import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, User } from "lucide-react";
import { LEGAL_OPERATOR } from "@/config/legal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ほぼ全員がユーザー名で登録しているので、メールの入力欄は畳んでおく
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { t } = useLanguage();

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

      toast.success(t("chrome.passwordReset.sentTitle"), {
        description: t("chrome.passwordReset.sentDesc"),
      });
      onBack();
    } catch (error) {
      setError(t("chrome.passwordReset.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!showEmailForm) {
    return (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>{t("chrome.passwordReset.usernameNote")}</p>
        <p className="text-muted-foreground">{t("chrome.passwordReset.loggedInHint")}</p>
        {LEGAL_OPERATOR.email && (
          <p className="text-muted-foreground">
            {t("chrome.passwordReset.contactHint", { email: LEGAL_OPERATOR.email })}
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button type="button" onClick={onBack} className="w-full">
            {t("chrome.passwordReset.backToLogin")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowEmailForm(true)} className="w-full text-xs text-muted-foreground">
            {t("chrome.passwordReset.emailAccount")}
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

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
            placeholder={t("chrome.passwordReset.emailPlaceholder")}
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex flex-col space-y-4">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("chrome.passwordReset.sending") : t("chrome.passwordReset.submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full"
          disabled={loading}
        >
          {t("chrome.passwordReset.backToLogin")}
        </Button>
      </div>
    </form>
  );
}