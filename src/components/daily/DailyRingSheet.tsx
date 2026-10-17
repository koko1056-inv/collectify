import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Flame, Heart, Moon, Package, Users, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyHub } from "@/hooks/useDailyHub";
import { ringDoneCount, type DailyRing } from "@/hooks/useDailyRing";
import { cn } from "@/lib/utils";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import type { PockePose } from "@/components/pocke/pockeAssets";
import { PockeRing, RING_GOALS } from "./PockeRing";

const GOALS: { key: "collect" | "care" | "social"; icon: LucideIcon; href: string }[] = [
  { key: "collect", icon: Package, href: "/quick-add" },
  { key: "care", icon: Heart, href: "/oshi" },
  { key: "social", icon: Users, href: "/explore" },
];

const POSE_BY_DONE: PockePose[] = ["wave", "cheer", "point", "celebrate"];

/** 今日のポッケリングの中身。3つの目標・連続日数・この7日・お休みの日・ログインボーナス */
export function DailyRingSheet({
  ring,
  open,
  onOpenChange,
}: {
  ring: DailyRing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const hub = useDailyHub();
  const done = ringDoneCount(ring);
  const flags: [boolean, boolean, boolean] = [ring.collect, ring.care, ring.social];

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const weekday = (day: string) =>
    new Date(`${day}T12:00:00+09:00`).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      weekday: "narrow",
      timeZone: "Asia/Tokyo",
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>{t("pocke.ring.title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-col items-center gap-3">
          <PockeRing done={flags} size={176} stroke={14}>
            <Pocke key={done} pose={POSE_BY_DONE[done]} height={104} motion="pop" />
          </PockeRing>
          <p className="flex items-center gap-1.5 text-base font-bold">
            <Flame className={cn("h-5 w-5", ring.streak > 0 ? "text-warning" : "text-muted-foreground")} aria-hidden />
            {ring.streak > 0 ? t("pocke.ring.streak", { n: ring.streak }) : t("pocke.ring.streakNone")}
          </p>
          <PockeBubble tail="top" className="max-w-sm text-center text-sm">
            {t(`pocke.ring.say${done}`)}
          </PockeBubble>
        </div>

        {/* 3つの目標 */}
        <ul className="mt-5 space-y-2">
          {GOALS.map((g, i) => {
            const isDone = flags[i];
            const Icon = g.icon;
            return (
              <li
                key={g.key}
                className={cn("flex items-center gap-3 rounded-2xl border p-3", isDone && "bg-muted/40")}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isDone ? cn(RING_GOALS[i].bg, "text-white") : "bg-muted"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" aria-hidden /> : <Icon className={cn("h-5 w-5", RING_GOALS[i].text)} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t(`pocke.ring.${g.key}`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`pocke.ring.${g.key}Desc`)}</p>
                </div>
                {isDone ? (
                  <span className={cn("shrink-0 text-xs font-bold", RING_GOALS[i].text)}>{t("pocke.ring.done")}</span>
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => go(g.href)}>
                    {t(`pocke.ring.${g.key}Go`)}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <p className={cn("mt-3 text-center text-sm font-semibold", ring.completed ? "text-points" : "text-muted-foreground")}>
          {ring.completed ? t("pocke.ring.completed", { n: ring.bonus }) : t("pocke.ring.bonus", { n: ring.bonus })}
        </p>

        {/* この7日 */}
        <section className="mt-5" aria-label={t("pocke.ring.week")}>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("pocke.ring.week")}</h3>
          <ol className="grid grid-cols-7 gap-1.5">
            {ring.week.map((d) => {
              const isToday = d.day === ring.today;
              return (
                <li key={d.day} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      d.full
                        ? "bg-primary text-primary-foreground"
                        : d.done
                          ? "bg-primary/15 text-primary"
                          : d.frozen
                            ? "bg-info/15 text-info"
                            : "border border-dashed border-muted-foreground/30 text-muted-foreground/40",
                      isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                    )}
                  >
                    {d.frozen && !d.done ? <Moon className="h-4 w-4" aria-hidden /> : <Flame className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className={cn("text-3xs", isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {weekday(d.day)}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">{t("pocke.ring.streakHint")}</p>
        </section>

        {/* お休みの日 */}
        <section className="mt-4 flex items-center gap-3 rounded-2xl bg-info/10 p-3">
          <Moon className="h-5 w-5 shrink-0 text-info" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("pocke.ring.freezes", { n: ring.freezes })}</p>
            <p className="text-xs text-muted-foreground">{t("pocke.ring.freezesHint")}</p>
          </div>
          {ring.freezes < 2 && (
            <Button size="sm" variant="ghost" className="shrink-0 gap-0.5 px-2 text-info" onClick={() => go("/point-shop")}>
              {t("pocke.ring.freezesBuy")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </section>

        {/* ログインボーナス（いままでの「今日分」） */}
        {hub.ready && (
          <button
            type="button"
            onClick={() => go("/point-shop/earn")}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-1 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex-1">
              {t("pocke.ring.login", { n: hub.streak })}
              {" · "}
              {hub.claimedToday && hub.todayPoints !== null
                ? t("engage.dailyHub.claimed", { n: hub.todayPoints })
                : t("engage.dailyHub.notClaimed")}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
