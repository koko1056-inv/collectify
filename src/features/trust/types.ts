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

import type { IconTileTone } from "@/components/ui/icon-tile";

export type TrustTier = "newbie" | "trusted" | "veteran" | "ace";

export interface TrustTierInfo {
  tier: TrustTier;
  label: string;
  /**
   * @deprecated 画面には出さない。TrustBadge は tone と lucide の印（芽・星・賞・王冠）で描く。
   * 以前は 🌱⭐️🌟👑 をそのまま出していて、端末ごとに絵柄が違い、安っぽく見えていた。
   * 外から読んでいるコードがあっても壊れないよう、値は残しておく。
   */
  emoji: string;
  /** 印の面（IconTile）の色。意味のトークンから選ぶ */
  tone: IconTileTone;
  /** 文字と枠の色（トークンのみ）。旧来の表示向けに残す */
  colorClass: string;
}

/**
 * ティアごとの見た目。1か所にまとめて、同じティアがどこでも同じ色・同じ印になるようにする。
 * 新人=芽（控えめな muted）/ 信頼=星（info）/ ベテラン=賞（success）/ エース=王冠（points の金）。
 * 以前はエースだけ violet の直書きで、新人とベテランも success / warning と段階の並びが読み取りにくかった。
 */
const TIER_STYLE: Record<TrustTier, Pick<TrustTierInfo, "label" | "emoji" | "tone" | "colorClass">> = {
  newbie: { label: "新人", emoji: "🌱", tone: "muted", colorClass: "text-muted-foreground border-border bg-muted" },
  trusted: { label: "信頼できる", emoji: "⭐️", tone: "info", colorClass: "text-info border-info/30 bg-info-soft" },
  veteran: { label: "ベテラン", emoji: "🌟", tone: "success", colorClass: "text-success border-success/30 bg-success-soft" },
  ace: { label: "エース", emoji: "👑", tone: "points", colorClass: "text-points border-points/30 bg-points-soft" },
};

const tierInfo = (tier: TrustTier): TrustTierInfo => ({ tier, ...TIER_STYLE[tier] });

/**
 * カテゴリ単独でのティア判定
 * 件数が少ないユーザーは絶対に「ベテラン」にならないようロジックで保護
 */
export function getCategoryTier(score: number, count: number): TrustTierInfo {
  if (count < 3) {
    return tierInfo("newbie");
  }
  const avg = score / Math.max(count, 1);
  if (count >= 20 && avg >= 1.5) {
    return tierInfo("veteran");
  }
  if (count >= 5 && avg >= 0.5) {
    return tierInfo("trusted");
  }
  return tierInfo("newbie");
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
    return tierInfo("ace");
  }
  if (veteranCount >= 1) {
    return tierInfo("veteran");
  }
  if (trustedOrAbove >= 2) {
    return tierInfo("trusted");
  }
  return tierInfo("newbie");
}

export const CATEGORY_LABELS: Record<TrustCategory, string> = {
  trade: "取引",
  collector: "コレクター",
  communication: "コミュニケーション",
};
