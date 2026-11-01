import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useProfile } from "@/hooks/useProfile";
import { useProfilePrivate, useSaveProfilePrivate } from "@/hooks/useProfilePrivate";
import { shouldNudgeProfileExtras } from "@/lib/profileExtras";
import { claimNudgeSlot, isNudgeSlotFree, isOverlayOpen } from "@/lib/nudgeSlot";
import { tourForLocation } from "@/components/onboarding/tours";
import { AboutYouSheet } from "./AboutYouSheet";

/** 画面に着いてから、これだけ待ってから出す（読み込みや画面ガイドと重ねない） */
const SETTLE_MS = 5000;
/** 出すのはふだんの画面（下タブ）だけ。共有リンクで開いた詳細ページなどでは出さない */
const NUDGE_PATHS = new Set(["/collection", "/me", "/explore", "/oshi", "/search", "/trade"]);
const dismissedKey = (uid: string) => `about_you_nudge_dismissed_${uid}`;

function readDismissed(uid: string): boolean {
  try {
    return localStorage.getItem(dismissedKey(uid)) === "1";
  } catch {
    return false;
  }
}

/**
 * すでに使っている人への「よかったら、あなたのことを教えてね」（下から出る小さなシート。1回きり）。
 * 新しく登録した人はウェルカムの「あなたのこと」ステップで聞くので、ここには来ない（そこで行を作る）。
 * 閉じても・答えても、profile_private に行を作って「聞いた」印にする（別の端末でも二度と出ない）。
 * 保存に失敗したときのために、この端末にも閉じた印を残す。
 */
export function AboutYouNudgeHost() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const { onboardingState, isInitialized, shouldShowTour } = useOnboarding();
  const { profile } = useProfile(user?.id);
  const welcomeDone = isInitialized && onboardingState.hasCompletedWelcome;
  const isSample = profile ? !!profile.is_sample : null;
  const { data, isError } = useProfilePrivate({ enabled: welcomeDone && isSample === false });
  const { markAsked } = useSaveProfilePrivate();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    setDismissed(user?.id ? readDismissed(user.id) : false);
  }, [user?.id]);

  const eligible = shouldNudgeProfileExtras({
    signedIn: !!user?.id,
    welcomeDone,
    isSample,
    row: isError ? "unknown" : data?.row ?? "unknown",
    dismissedLocally: dismissed,
  });
  // この画面の操作ガイドがこれから出るなら、そちらを先にする
  const tour = tourForLocation(pathname, search);
  const tourPending = new URLSearchParams(search).has("guide") || (!!tour && shouldShowTour(tour.id));
  const onMainScreen = NUDGE_PATHS.has(pathname);

  useEffect(() => {
    if (!eligible || !onMainScreen || tourPending || open || !user?.id) return;
    if (!isNudgeSlotFree("aboutYou")) return;
    const timer = window.setTimeout(() => {
      // 待っているあいだに開いたシート・ダイアログがあれば、今回は見送る（次の画面で）
      if (isOverlayOpen()) return;
      if (!claimNudgeSlot("aboutYou")) return;
      setOpen(true);
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [eligible, onMainScreen, tourPending, open, user?.id, pathname]);

  /** 1回きり: どう閉じても「聞いた」にする */
  const remember = () => {
    if (!user?.id) return;
    try {
      localStorage.setItem(dismissedKey(user.id), "1");
    } catch {
      /* 端末に残せなくても、下の DB の印で足りる */
    }
    setDismissed(true);
    markAsked().catch((e) => console.error("[AboutYouNudgeHost] markAsked failed", e));
  };

  const close = () => {
    setOpen(false);
    remember();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && close()}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:mx-auto sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-end gap-2">
            <Pocke pose="think" height={120} motion="pop" className="-mb-1 shrink-0" />
            <PockeBubble tail="left" className="mb-5 flex-1">
              <SheetTitle className="text-base font-bold">{t("aboutYou.nudge.title")}</SheetTitle>
              <SheetDescription className="mt-0.5 text-sm text-foreground">{t("aboutYou.nudge.desc")}</SheetDescription>
            </PockeBubble>
          </div>
          <div className="mt-4 space-y-2">
            <Button
              className="h-12 w-full rounded-full text-base font-bold"
              onClick={() => {
                close();
                setFormOpen(true);
              }}
            >
              {t("aboutYou.nudge.cta")}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={close}>
              {t("aboutYou.nudge.later")}
            </Button>
            <p className="text-center text-2xs text-muted-foreground">{t("aboutYou.nudge.laterNote")}</p>
          </div>
        </SheetContent>
      </Sheet>
      <AboutYouSheet open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
