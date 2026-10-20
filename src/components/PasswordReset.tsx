import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ChevronDown, Lock, User } from "lucide-react";
import { LEGAL_OPERATOR } from "@/config/legal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { PasswordRequirements } from "@/components/PasswordRequirements";

interface PasswordResetProps {
  onBack: () => void;
  /** 再設定が成功したら、ログイン画面にユーザー名を入力済みで戻すために呼ぶ */
  onSuccess: (username: string) => void;
}

type Step = "username" | "question" | "success" | "email";
type ResetFailureReason = "unavailable" | "mismatch_or_locked" | "weak_password" | "other";

const MIN_PASSWORD_LENGTH = 6;

/**
 * パスワードを忘れたときの再設定。
 *
 * ユーザー名 → 秘密の質問の答え + 新しいパスワード → 完了、の3ステップ。
 * ユーザー名が存在しない・秘密の質問が未設定・サンプルアカウントは、どれも区別せず
 * 同じ中立的なメッセージにする（列挙対策。supabase/functions/secret-question-reset 参照）。
 *
 * メールアドレスで登録した（ごく少数の）既存アカウント向けに、以前からあった
 * resetPasswordForEmail の導線も折りたたんで残す。
 */
export function PasswordReset({ onBack, onSuccess }: PasswordResetProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("username");

  const [username, setUsername] = useState("");
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const failureMessage = (reason: ResetFailureReason): string => {
    switch (reason) {
      case "weak_password":
        return t("chrome.passwordReset.weakPassword");
      case "unavailable":
        return t("chrome.passwordReset.unavailable", { email: LEGAL_OPERATOR.email });
      case "mismatch_or_locked":
        return t("chrome.passwordReset.mismatchOrLocked");
      default:
        return t("chrome.passwordReset.genericError");
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("secret-question-reset", {
        body: { action: "lookup", username: username.trim() },
      });
      if (invokeError) throw invokeError;
      if (data?.ok) {
        setQuestionId(data.question_id as string);
        setAnswer("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("question");
      } else {
        setError(failureMessage((data?.reason as ResetFailureReason) ?? "unavailable"));
      }
    } catch (err) {
      console.error("secret-question-reset lookup failed:", err);
      setError(t("chrome.passwordReset.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmitReset =
    answer.trim().length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === newPassword &&
    !loading;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitReset) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("secret-question-reset", {
        body: { action: "reset", username: username.trim(), answer, new_password: newPassword },
      });
      if (invokeError) throw invokeError;
      if (data?.ok) {
        setStep("success");
      } else {
        setError(failureMessage((data?.reason as ResetFailureReason) ?? "mismatch_or_locked"));
      }
    } catch (err) {
      console.error("secret-question-reset reset failed:", err);
      setError(t("chrome.passwordReset.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      toast.success(t("chrome.passwordReset.sentTitle"), {
        description: t("chrome.passwordReset.sentDesc"),
      });
      onBack();
    } catch (err) {
      console.error("resetPasswordForEmail failed:", err);
      setEmailError(t("chrome.passwordReset.failed"));
    } finally {
      setEmailSending(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
        <p className="text-sm font-medium">{t("chrome.passwordReset.successTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("chrome.passwordReset.successDesc")}</p>
        <Button type="button" className="w-full" onClick={() => onSuccess(username.trim())}>
          {t("chrome.passwordReset.backToLoginButton")}
        </Button>
      </div>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {emailError && (
          <Alert variant="destructive" className="animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{emailError}</AlertDescription>
          </Alert>
        )}
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
        <div className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={emailSending}>
            {emailSending ? t("chrome.passwordReset.sending") : t("chrome.passwordReset.submit")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("username")} className="w-full" disabled={emailSending}>
            {t("chrome.passwordReset.backToLogin")}
          </Button>
        </div>
      </form>
    );
  }

  if (step === "question") {
    return (
      <form onSubmit={handleReset} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label>{t("chrome.passwordReset.questionLabel")}</Label>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
            {questionId ? t(`chrome.secretQuestion.questions.${questionId}`) : ""}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-answer">{t("chrome.passwordReset.answerLabel")}</Label>
          <Input
            id="reset-answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("chrome.passwordReset.answerPlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-new-password">{t("chrome.passwordReset.newPasswordLabel")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          <PasswordRequirements password={newPassword} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">{t("chrome.passwordReset.confirmPasswordLabel")}</Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={passwordMismatch}
            required
          />
          {passwordMismatch && <p className="text-xs text-destructive">{t("chrome.passwordReset.passwordMismatch")}</p>}
        </div>
        <div className="flex flex-col space-y-3">
          <Button type="submit" className="w-full" disabled={!canSubmitReset}>
            {loading ? t("chrome.passwordReset.submitting") : t("chrome.passwordReset.submitButton")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("username")} className="w-full text-sm" disabled={loading}>
            {t("chrome.passwordReset.backToLogin")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleLookup} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("chrome.passwordReset.intro")}</p>
      {error && (
        <Alert variant="destructive" className="animate-shake">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="relative">
        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder={t("chrome.passwordReset.usernamePlaceholder")}
          className="pl-10"
        />
      </div>
      <div className="flex flex-col space-y-3">
        <Button type="submit" className="w-full" disabled={loading || username.trim().length === 0}>
          {loading ? t("chrome.passwordReset.lookingUp") : t("chrome.passwordReset.lookupButton")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} className="w-full" disabled={loading}>
          {t("chrome.passwordReset.backToLogin")}
        </Button>
        {LEGAL_OPERATOR.email && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep("email")}
            className="w-full text-xs text-muted-foreground"
            disabled={loading}
          >
            {t("chrome.passwordReset.emailAccount")}
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </form>
  );
}
