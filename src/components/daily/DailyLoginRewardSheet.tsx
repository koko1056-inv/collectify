import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Coins, Flame, Image as ImageIcon, PackagePlus, ShieldHalf, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import { LineFriendCard } from "@/components/line/LineFriendCard";
import type { PockePose } from "@/components/pocke/pockeAssets";
import { cosmeticI18nId, isCoverKey, isFrameKey } from "@/lib/cosmetics";
import {
  useClaimDailyLoginReward,
  type DailyLoginClaimResult,
  type DailyLoginRewardKind,
  type DailyLoginStatus,
  type DailyLoginWeekDay,
} from "@/hooks/useDailyLoginReward";

const KIND_ICON: Record<DailyLoginRewardKind, LucideIcon> = {
  points: Coins,
  cosmetic_cover: ImageIcon,
  cosmetic_frame: ShieldHalf,
  points_slot: PackagePlus,
};

function dayLabel(t: (k: string, v?: Record<string, string | number>) => string, day: DailyLoginWeekDay): string {
  if (day.kind === "cosmetic_cover") return t("pocke.dailyLogin.kindCover");
  if (day.kind === "cosmetic_frame") return t("pocke.dailyLogin.kindFrame");
  if (day.kind === "points_slot") return t("pocke.dailyLogin.kindSlot", { n: day.points, slots: day.slot_bonus });
  return t("pocke.dailyLogin.kindPoints", { n: day.points });
}

function cosmeticName(t: (k: string, v?: Record<string, string | number>) => string, key: string): string {
  const id = cosmeticI18nId(key);
  const name = t(`cosmetics.items.${id}.name`);
  if (isCoverKey(key)) return t("cosmetics.kind.cover", { name });
  if (isFrameKey(key)) return t("cosmetics.kind.frame", { name });
  return name;
}

/**
 * 今日のログイン報酬。7日サイクルのカレンダー（ポイント・カバー・フレーム・コレクション枠）と、
 * 7・14・30日の連続記録のお祝い。アプリを開いたとき自動で出る（DailyLoginRewardHost）ほか、
 * 今日のポッケリング・ポイントのもらい方からも開ける。
 */
export function DailyLoginRewardSheet({
  status,
  open,
  onOpenChange,
}: {
  status: DailyLoginStatus | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const claim = useClaimDailyLoginReward();
  const [result, setResult] = useState<DailyLoginClaimResult | null>(null);

  if (!status) return null;

  const streak = result?.streak ?? status.streak;
  const week = result?.week ?? status.week;
  // 今回の操作で受け取れた（内訳を見せる） / すでに今日の分を受け取っていた（「また明日」だけ見せる）
  const claimedNow = !!result && result.claimed;
  const alreadyClaimedNoDetail = (!!result && result.already_claimed) || (!result && status.claimed_today);
  const showResult = claimedNow || alreadyClaimedNoDetail;
  const todayDay = week.find((d) => d.is_today) ?? week[0];

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setResult(null);
  };

  const handleClaim = () => {
    claim.mutate(undefined, { onSuccess: (data) => setResult(data) });
  };

  const pose: PockePose = result?.milestone || (result?.slot_bonus ?? 0) > 0
    ? "celebrate"
    : result?.cosmetic_unlocked
      ? "love"
      : "wink";

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>{t("pocke.dailyLogin.title")}</SheetTitle>
          <SheetDescription>{t("pocke.dailyLogin.subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex flex-col items-center gap-3">
          <Pocke key={showResult ? "result" : "ask"} pose={showResult ? pose : "point"} height={116} motion="pop" />
          <p className="flex items-center gap-1.5 text-base font-bold">
            <Flame className={cn("h-5 w-5", streak > 0 ? "text-warning" : "text-muted-foreground")} aria-hidden />
            {streak > 0 ? t("pocke.dailyLogin.streak", { n: streak }) : t("pocke.dailyLogin.streakNone")}
          </p>

          {!showResult ? (
            <>
              <PockeBubble tail="top" className="max-w-sm text-center text-sm">
                {t(`pocke.dailyLogin.${todayDay.kind === "cosmetic_cover" ? "kindCover" : todayDay.kind === "cosmetic_frame" ? "kindFrame" : todayDay.kind === "points_slot" ? "kindSlot" : "kindPoints"}`, {
                  n: todayDay.points,
                  slots: todayDay.slot_bonus,
                })}
              </PockeBubble>
              <Button
                size="lg"
                className="w-full max-w-xs rounded-full text-base font-bold"
                disabled={claim.isPending}
                onClick={handleClaim}
              >
                {t("pocke.dailyLogin.claim")}
              </Button>
            </>
          ) : alreadyClaimedNoDetail && !claimedNow ? (
            <PockeBubble tail="top" className="max-w-sm text-center text-sm">
              {t("pocke.dailyLogin.claimedToday")}
            </PockeBubble>
          ) : (
            <div className="flex w-full max-w-sm flex-col items-center gap-1.5 rounded-2xl bg-points-soft px-4 py-3 text-center">
              <p className="text-base font-bold text-points">{t("pocke.dailyLogin.resultTitle")}</p>
              {result?.cosmetic_unlocked ? (
                <p className="text-sm font-semibold">
                  {t("pocke.dailyLogin.resultCosmetic", { name: cosmeticName(t, result.cosmetic_unlocked) })}
                </p>
              ) : (result?.points_awarded ?? 0) > 0 ? (
                <p className="text-sm font-semibold">
                  {t(todayDay.kind === "cosmetic_cover" || todayDay.kind === "cosmetic_frame" ? "pocke.dailyLogin.resultFallback" : "pocke.dailyLogin.resultPoints", {
                    n: result?.points_awarded ?? 0,
                  })}
                </p>
              ) : null}
              {(result?.slot_bonus ?? 0) > 0 && (
                <p className="text-sm font-semibold">{t("pocke.dailyLogin.resultSlot", { n: result?.slot_bonus ?? 0 })}</p>
              )}
              {result?.milestone && (
                <div className="mt-1 rounded-xl border border-points/30 bg-card px-3 py-2">
                  <p className="text-xs font-bold text-points">{t("pocke.dailyLogin.milestoneTitle", { n: result.milestone })}</p>
                  {(result.milestone_points ?? 0) > 0 && (
                    <p className="text-2xs text-muted-foreground">{t("pocke.dailyLogin.milestonePoints", { n: result.milestone_points ?? 0 })}</p>
                  )}
                </div>
              )}
              <Button size="sm" className="mt-2 rounded-full" onClick={() => close(false)}>
                {t("pocke.dailyLogin.close")}
              </Button>
            </div>
          )}

          {claimedNow && <LineFriendCard className="w-full max-w-sm" />}
        </div>

        <section className="mt-5" aria-label={t("pocke.dailyLogin.week")}>
          <h3 className="mb-2 text-xs font-bold text-muted-foreground">{t("pocke.dailyLogin.week")}</h3>
          <ol className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const Icon = KIND_ICON[d.kind];
              const isToday = d.is_today;
              const isClaimedToday = isToday && (showResult || status.claimed_today);
              return (
                <li key={d.offset} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      isClaimedToday
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-primary/15 text-primary"
                          : "border border-dashed border-muted-foreground/30 text-muted-foreground/50",
                      isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                    )}
                  >
                    {isClaimedToday ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                  </span>
                  <span className={cn("text-center text-3xs leading-tight", isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {dayLabel(t, d)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {status.milestones.length > 0 && (
          <section className="mt-4 rounded-2xl bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {status.milestones.map((m) => (
                <span
                  key={m.streak_days}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-2xs font-bold",
                    streak >= m.streak_days ? "bg-points-soft text-points" : "bg-background text-muted-foreground"
                  )}
                >
                  {t("pocke.dailyLogin.milestoneTitle", { n: m.streak_days })}
                </span>
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => {
            close(false);
            navigate("/point-shop/earn");
          }}
          className="mt-3 w-full rounded-xl px-1 py-2 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {t("screens.pointShop.title")}
        </button>
      </SheetContent>
    </Sheet>
  );
}
