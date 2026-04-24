import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTrustScore } from "./useTrustScore";
import { getCategoryTier, getOverallTier, CATEGORY_LABELS, type TrustCategory, type TrustScore } from "./types";

interface TrustBadgeProps {
  userId?: string | null;
  /** 既に取得済のスコアがあれば渡せる（リスト表示用） */
  score?: TrustScore;
  /** 単一カテゴリ表示。未指定なら総合ティア */
  category?: TrustCategory;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export function TrustBadge({
  userId,
  score: passedScore,
  category,
  size = "sm",
  showLabel = true,
}: TrustBadgeProps) {
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

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0 h-4 gap-0.5",
    sm: "text-xs px-2 py-0.5 h-5 gap-1",
    md: "text-sm px-2.5 py-1 h-6 gap-1",
  }[size];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${tier.colorClass} ${sizeClasses} font-medium inline-flex items-center`}>
            <span>{tier.emoji}</span>
            {showLabel && <span>{tier.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {category ? (
            <p>{CATEGORY_LABELS[category]}信頼度：{tier.label}</p>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold">総合ティア：{tier.label}</p>
              <p>取引 {score.trade_count}件 / コレクター {score.collector_count}件 / 交流 {score.communication_count}件</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
