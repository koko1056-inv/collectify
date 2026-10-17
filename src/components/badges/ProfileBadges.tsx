import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBadgeStats } from "@/hooks/useBadgeStats";
import { cn } from "@/lib/utils";
import { PockeSays } from "@/components/pocke/Pocke";
import { BADGES, MAX_TIER, badgeProgress, badgeTier } from "./badgeDefs";
import { BadgeMedal } from "./BadgeMedal";

/**
 * プロフィールの実績バッジ。8種類 × 4段（ブロンズ・シルバー・ゴールド・虹）。
 * 1行に並べて、押すと一覧（次の段まであといくつか）が開く。人のプロフィールでも見られる
 */
export function ProfileBadges({ userId, isOwn, className }: { userId: string; isOwn: boolean; className?: string }) {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useBadgeStats(userId);
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className={cn("h-28 w-full rounded-2xl", className)} />;
  if (!stats) return null;

  const earned = BADGES.reduce((sum, def) => sum + badgeTier(def, stats), 0);
  const total = BADGES.length * MAX_TIER;

  return (
    <section className={cn("rounded-2xl border bg-card p-3", className)} aria-label={t("badges.title")}>
      <button type="button" onClick={() => setOpen(true)} className="mb-2 flex w-full items-center gap-2 text-left">
        <h2 className="text-sm font-bold">{t("badges.title")}</h2>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {t("badges.count", { n: earned, total })}
        </span>
        <span className="ml-auto flex items-center text-xs font-medium text-primary">
          {t("badges.seeAll")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BADGES.map((def) => {
          const tier = badgeTier(def, stats);
          return (
            <li key={def.key} className="w-16 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full flex-col items-center gap-1"
                aria-label={`${t(`badges.names.${def.key}`)}: ${t(`badges.tier.${tier}`)}`}
              >
                <BadgeMedal def={def} tier={tier} size={52} />
                <span className="w-full truncate text-center text-3xs text-muted-foreground">
                  {t(`badges.names.${def.key}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-baseline gap-2">
              {t("badges.title")}
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {t("badges.count", { n: earned, total })}
              </span>
            </SheetTitle>
          </SheetHeader>
          {isOwn && (
            <PockeSays pose={earned > 0 ? "cheer" : "point"} height={64} className="mt-3" bubbleClassName="text-sm">
              {earned > 0 ? t("badges.sheetSay") : t("badges.empty")}
            </PockeSays>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {BADGES.map((def) => {
              const p = badgeProgress(def, stats);
              const nextTarget = p.tier >= MAX_TIER ? def.tiers[MAX_TIER - 1] : def.tiers[p.tier];
              return (
                <li key={def.key} className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center">
                  <BadgeMedal def={def} tier={p.tier} size={60} />
                  <p className="text-sm font-bold leading-tight">{t(`badges.names.${def.key}`)}</p>
                  <p className={cn("text-3xs font-bold", p.tier > 0 ? "text-points" : "text-muted-foreground")}>
                    {t(`badges.tier.${p.tier}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(`badges.desc.${def.key}`, { n: nextTarget })}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(p.ratio * 100)}%` }} />
                  </div>
                  <p className="text-3xs tabular-nums text-muted-foreground">
                    {p.tier >= MAX_TIER
                      ? t("badges.maxed")
                      : `${p.value}/${p.target} · ${t("badges.next", { n: p.remaining, tier: t(`badges.tier.${p.tier + 1}`) })}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </section>
  );
}
