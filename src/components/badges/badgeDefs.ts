import { ArrowLeftRight, BookOpen, Camera, Flame, Heart, Package, PenLine, Trophy, type LucideIcon } from "lucide-react";

/** get_badge_stats の返り値 */
export interface BadgeStats {
  items: number;
  completions: number;
  best_streak: number;
  trades: number;
  posts: number;
  photos: number;
  oshi_level: number;
  series: number;
}

export interface BadgeDef {
  key: "collector" | "complete" | "streak" | "trader" | "storyteller" | "photographer" | "caretaker" | "zukan";
  stat: keyof BadgeStats;
  icon: LucideIcon;
  /** ブロンズ・シルバー・ゴールド・レインボーに必要な数 */
  tiers: [number, number, number, number];
}

/**
 * 実績バッジの一覧。並びはアプリの本題の順（集める → コンプ → 毎日 → 交換 → 投稿・写真・育てる → 図鑑）。
 * 最初の段は1回やればもらえる数にして、始めたばかりの人にもすぐ1つ目が付くようにする
 */
export const BADGES: BadgeDef[] = [
  { key: "collector", stat: "items", icon: Package, tiers: [1, 10, 50, 200] },
  { key: "complete", stat: "completions", icon: Trophy, tiers: [1, 3, 10, 30] },
  { key: "streak", stat: "best_streak", icon: Flame, tiers: [3, 7, 30, 100] },
  { key: "trader", stat: "trades", icon: ArrowLeftRight, tiers: [1, 5, 20, 50] },
  { key: "storyteller", stat: "posts", icon: PenLine, tiers: [1, 10, 50, 150] },
  { key: "photographer", stat: "photos", icon: Camera, tiers: [1, 7, 30, 100] },
  { key: "caretaker", stat: "oshi_level", icon: Heart, tiers: [3, 5, 8, 10] },
  { key: "zukan", stat: "series", icon: BookOpen, tiers: [3, 10, 25, 50] },
];

export const MAX_TIER = 4;

/** いまの段（0 = まだ、4 = レインボー） */
export function badgeTier(def: BadgeDef, stats: BadgeStats | null | undefined): number {
  const v = stats?.[def.stat] ?? 0;
  return def.tiers.filter((n) => v >= n).length;
}

/** 次の段までの進み具合 */
export function badgeProgress(def: BadgeDef, stats: BadgeStats | null | undefined) {
  const v = stats?.[def.stat] ?? 0;
  const tier = badgeTier(def, stats);
  if (tier >= MAX_TIER) return { tier, value: v, target: def.tiers[MAX_TIER - 1], remaining: 0, ratio: 1 };
  const prev = tier === 0 ? 0 : def.tiers[tier - 1];
  const target = def.tiers[tier];
  return { tier, value: v, target, remaining: target - v, ratio: Math.max(0, Math.min(1, (v - prev) / (target - prev))) };
}
