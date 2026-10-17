import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOshiNewBadge } from "@/hooks/useOshiReleases";
import { Pocke, PockeBubble } from "./Pocke";

/** 何日あいたら「ひさしぶり」と言うか */
const AWAY_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const lastSeenKey = (uid: string) => `pocke_last_seen_${uid}`;

/**
 * ひさしぶりにコレクション画面を開いたときの、ポッケのあいさつ（下から出るシート）。
 * Duolingo のフクロウの「さみしかった」にならって、責めずに、そのあいだに出た推しの新着へ案内する。
 * 最後に開いた時刻は端末に置く（初めての端末では何も言わない。開くたびに今の時刻に書き換える）。
 */
export function PockeWelcomeBack() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id;
  const releases = useOshiNewBadge();
  const [awayDays, setAwayDays] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    try {
      const prev = Number(localStorage.getItem(lastSeenKey(uid)) || 0);
      const now = Date.now();
      if (prev > 0 && now - prev >= AWAY_DAYS * DAY_MS) setAwayDays(Math.floor((now - prev) / DAY_MS));
      localStorage.setItem(lastSeenKey(uid), String(now));
    } catch {
      // 端末に保存できないときは何も言わない
    }
  }, [uid]);

  const open = awayDays !== null;
  const close = () => setAwayDays(null);
  const hasNew = releases.unseen > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:mx-auto sm:max-w-md">
        <div className="flex items-end gap-2">
          <Pocke pose="sad" height={132} motion="pop" className="-mb-1 shrink-0" />
          <PockeBubble tail="left" className="mb-6 flex-1">
            <SheetTitle className="text-base font-bold">{t("pocke.welcomeBack.title", { n: awayDays ?? AWAY_DAYS })}</SheetTitle>
            <SheetDescription className="mt-0.5 text-sm text-foreground">
              {hasNew ? t("pocke.welcomeBack.withNew", { n: releases.unseen > 99 ? "99+" : releases.unseen }) : t("pocke.welcomeBack.noNew")}
            </SheetDescription>
          </PockeBubble>
        </div>
        <div className="mt-4 space-y-2">
          <Button
            className="h-12 w-full rounded-full text-base font-bold"
            onClick={() => {
              close();
              if (hasNew) navigate("/releases?tab=new");
            }}
          >
            {hasNew ? t("pocke.welcomeBack.ctaNew") : t("pocke.welcomeBack.ctaCollection")}
          </Button>
          {hasNew && (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={close}>
              {t("pocke.welcomeBack.later")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
