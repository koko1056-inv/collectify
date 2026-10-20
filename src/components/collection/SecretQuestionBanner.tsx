import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { SECRET_QUESTION_STATUS_QUERY_KEY, fetchMySecretQuestionStatus } from "@/utils/secretQuestion";
import { SecretQuestionForm } from "@/components/profile/SecretQuestionForm";
import { NOTICE_PRIORITY, useNoticeTurn } from "./noticeSlot";

const DISMISS_DAYS = 7;
const dismissedUntilKey = (uid: string) => `secret_question_banner_dismissed_until_${uid}`;

function readDismissedUntil(uid: string): number {
  try {
    return Number(localStorage.getItem(dismissedUntilKey(uid))) || 0;
  } catch {
    return 0;
  }
}

/**
 * 秘密の質問が未設定の人に、設定を促すやさしいバナー。
 * サンプルアカウント・設定済み・ウェルカム表示中は出さない。閉じたら7日間は出さない。
 */
export function SecretQuestionBanner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { onboardingState, isInitialized } = useOnboarding();
  const [dismissedUntil, setDismissedUntil] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.id) setDismissedUntil(readDismissedUntil(user.id));
  }, [user?.id]);

  const isSample = !!profile?.is_sample;
  const { data: status } = useQuery({
    queryKey: [SECRET_QUESTION_STATUS_QUERY_KEY, user?.id],
    queryFn: fetchMySecretQuestionStatus,
    enabled: !!user?.id && !isSample,
    staleTime: 1000 * 60,
  });

  const wants =
    !!user?.id &&
    !isSample &&
    isInitialized &&
    onboardingState.hasCompletedWelcome &&
    status?.hasQuestion === false &&
    Date.now() >= dismissedUntil;

  const myTurn = useNoticeTurn("secretQuestion", NOTICE_PRIORITY.secretQuestion, wants);

  if (!myTurn) return null;

  const handleDismiss = () => {
    if (user?.id) {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      try {
        localStorage.setItem(dismissedUntilKey(user.id), String(until));
      } catch {
        /* ストレージが使えなくても、この場では閉じられる */
      }
      setDismissedUntil(until);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <HelpCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium">{t("chrome.secretQuestion.banner.title")}</p>
        <Button size="sm" className="shrink-0 rounded-full" onClick={() => setOpen(true)}>
          {t("chrome.secretQuestion.banner.cta")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          aria-label={t("chrome.secretQuestion.banner.dismiss")}
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("chrome.secretQuestion.heading")}</DialogTitle>
            <DialogDescription>{t("chrome.secretQuestion.description")}</DialogDescription>
          </DialogHeader>
          <SecretQuestionForm onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
