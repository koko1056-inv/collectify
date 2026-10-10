import { Award, Crown, Sprout, Star, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTrustScore } from "./useTrustScore";
import { getCategoryTier, getOverallTier, type TrustCategory, type TrustScore, type TrustTier } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrustBadgeProps {
  userId?: string | null;
  /** 既に取得済のスコアがあれば渡せる（リスト表示用） */
  score?: TrustScore;
  /** 単一カテゴリ表示。未指定なら総合ティア */
  category?: TrustCategory;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

/**
 * ティアの印。以前は 🌱⭐️🌟👑 の絵文字を色付きの枠の中に出していた。
 * いまは lucide の線の印を IconTile（意味のトークンの薄い面）に入れ、名前は普通の文字色で添える。
 */
const TIER_ICON: Record<TrustTier, LucideIcon> = {
  newbie: Sprout,
  trusted: Star,
  veteran: Award,
  ace: Crown,
};

export function TrustBadge({
  userId,
  score: passedScore,
  category,
  size = "sm",
  showLabel = true,
}: TrustBadgeProps) {
  const { t } = useLanguage();
  const { data: fetched } = useTrustScore(passedScore ? null : userId);
  const score = passedScore ?? fetched;

  if (!score) return null;

  const tier = category
    ? getCategoryTier(
        category === "trade" ? score.trade_score : category === "collector" ? score.collector_score : score.communication_score,
        category === "trade" ? score.trade_count : category === "collector" ? score.collector_count : score.communication_count,
      )
    : getOverallTier(score);

  const totalCount = score.trade_count + score.collector_count + score.communication_count;

  const tierLabel = t(`trade.trustTier.${tier.tier}`);

  const Icon = TIER_ICON[tier.tier];
  // xs は一覧の名前の横に並ぶので、面も小さく（16px）する。sm / md は IconTile の xs（24px）
  const tileClass = size === "xs" ? "h-4 w-4 rounded [&_svg]:size-2.5" : undefined;
  const textClass = { xs: "text-3xs", sm: "text-xs", md: "text-sm" }[size];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center font-medium text-foreground/80",
              size === "xs" ? "gap-1" : "gap-1.5",
              textClass
            )}
            role={showLabel ? undefined : "img"}
            aria-label={showLabel ? undefined : tierLabel}
          >
            <IconTile tone={tier.tone} size="xs" className={tileClass}>
              <Icon />
            </IconTile>
            {showLabel && <span>{tierLabel}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {category ? (
            <p>{t("trade.trust.categoryTooltip", { category: t(`trade.trustCategory.${category}`), tier: tierLabel })}</p>
          ) : (
            <div className="space-y-1">
              <p className="font-bold">{t("trade.trust.overallTooltip", { tier: tierLabel })}</p>
              <p>{t("trade.trust.countsTooltip", { trade: score.trade_count, collector: score.collector_count, communication: score.communication_count })}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
