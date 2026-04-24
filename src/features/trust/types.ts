export type TrustCategory = "trade" | "collector" | "communication";

export interface TrustScore {
  user_id: string;
  trade_score: number;
  trade_count: number;
  collector_score: number;
  collector_count: number;
  communication_score: number;
  communication_count: number;
}

export type TrustTier = "newbie" | "trusted" | "veteran" | "ace";

export interface TrustTierInfo {
  tier: TrustTier;
  label: string;
  emoji: string;
  colorClass: string;
}

/**
 * カテゴリ単独でのティア判定
 * 件数が少ないユーザーは絶対に「ベテラン」にならないようロジックで保護
 */
export function getCategoryTier(score: number, count: number): TrustTierInfo {
  if (count < 3) {
    return { tier: "newbie", label: "新人", emoji: "🌱", colorClass: "text-emerald-600 border-emerald-200 bg-emerald-50" };
  }
  const avg = score / Math.max(count, 1);
  if (count >= 20 && avg >= 1.5) {
    return { tier: "veteran", label: "ベテラン", emoji: "🌟", colorClass: "text-amber-600 border-amber-200 bg-amber-50" };
  }
  if (count >= 5 && avg >= 0.5) {
    return { tier: "trusted", label: "信頼できる", emoji: "⭐️", colorClass: "text-blue-600 border-blue-200 bg-blue-50" };
  }
  return { tier: "newbie", label: "新人", emoji: "🌱", colorClass: "text-emerald-600 border-emerald-200 bg-emerald-50" };
}

/**
 * 全カテゴリの総合ティア（プロフィールメインバッジ用）
 */
export function getOverallTier(s: TrustScore): TrustTierInfo {
  const tiers = [
    getCategoryTier(s.trade_score, s.trade_count),
    getCategoryTier(s.collector_score, s.collector_count),
    getCategoryTier(s.communication_score, s.communication_count),
  ];
  const veteranCount = tiers.filter(t => t.tier === "veteran").length;
  const trustedOrAbove = tiers.filter(t => t.tier === "veteran" || t.tier === "trusted").length;
  if (veteranCount >= 2 && trustedOrAbove === 3) {
    return { tier: "ace", label: "エース", emoji: "👑", colorClass: "text-violet-600 border-violet-200 bg-violet-50" };
  }
  if (veteranCount >= 1) {
    return { tier: "veteran", label: "ベテラン", emoji: "🌟", colorClass: "text-amber-600 border-amber-200 bg-amber-50" };
  }
  if (trustedOrAbove >= 2) {
    return { tier: "trusted", label: "信頼できる", emoji: "⭐️", colorClass: "text-blue-600 border-blue-200 bg-blue-50" };
  }
  return { tier: "newbie", label: "新人", emoji: "🌱", colorClass: "text-emerald-600 border-emerald-200 bg-emerald-50" };
}

export const CATEGORY_LABELS: Record<TrustCategory, string> = {
  trade: "取引",
  collector: "コレクター",
  communication: "コミュニケーション",
};
