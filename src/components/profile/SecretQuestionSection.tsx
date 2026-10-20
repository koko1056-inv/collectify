import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { SECRET_QUESTION_STATUS_QUERY_KEY, fetchMySecretQuestionStatus } from "@/utils/secretQuestion";
import { SecretQuestionForm } from "./SecretQuestionForm";

interface SecretQuestionSectionProps {
  /** サンプルアカウント（profiles.is_sample）は対象外。行自体を出さない。 */
  isSample: boolean;
}

/** すでに設定済みの質問を変更するときだけ、先に現在のパスワードで本人確認する。 */
type Stage = "verify" | "form";

/** 設定の「アカウント」に出す、秘密の質問の設定・変更。 */
export function SecretQuestionSection({ isSample }: SecretQuestionSectionProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: [SECRET_QUESTION_STATUS_QUERY_KEY, user?.id],
    queryFn: fetchMySecretQuestionStatus,
    enabled: !!user?.id && !isSample,
    staleTime: 1000 * 60,
  });
  const hasQuestion = !!status?.hasQuestion;

  const openDialog = () => {
    setCurrentPassword("");
    setVerifyError(null);
    // 未設定の人はそのまま入力フォームへ。変更するときだけ本人確認を挟む
    setStage(hasQuestion ? "verify" : "form");
    setOpen(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      // ユーザー名＋パスワードのアカウントは email が username@example.com 形式（src/utils/auth.ts）。
      // 同じ email で signInWithPassword を呼び、現在のパスワードが合っているかだけを確かめる。
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (error) throw error;
      setStage("form");
    } catch (err) {
      console.error("Current password verification failed:", err);
      setVerifyError(t("chrome.secretQuestion.verifyFailed"));
    } finally {
      setVerifying(false);
    }
  };

  if (isSample) return null;

  return (
    <>
      <button
        onClick={openDialog}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="text-muted-foreground">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t("chrome.secretQuestion.heading")}</div>
        </div>
        <span className="text-xs text-muted-foreground">
          {hasQuestion ? t("chrome.secretQuestion.change") : t("chrome.secretQuestion.save")}
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!verifying) setOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          {stage === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{t("chrome.secretQuestion.heading")}</DialogTitle>
                <DialogDescription>{t("chrome.secretQuestion.currentPasswordLabel")}</DialogDescription>
              </DialogHeader>
              {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
              <div className="space-y-2">
                <Label htmlFor="secret-question-current-password">
                  {t("chrome.secretQuestion.currentPasswordLabel")}
                </Label>
                <Input
                  id="secret-question-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("chrome.secretQuestion.currentPasswordPlaceholder")}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={currentPassword.length === 0 || verifying} className="w-full">
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("chrome.passwordReset.lookupButton")}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("chrome.secretQuestion.heading")}</DialogTitle>
                <DialogDescription>{t("chrome.secretQuestion.description")}</DialogDescription>
              </DialogHeader>
              <SecretQuestionForm onSaved={() => setOpen(false)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
