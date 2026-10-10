import { Eye, Gift, Handshake, Heart, Package, type LucideIcon } from "lucide-react";

export interface MatchCandidate {
  candidate_id: string;
  shared_interests: number;
  shared_items: number;
  tradeable_items: number;
  score: number;
}

export type DiffType =
  | "common"
  | "they_have_i_want"
  | "i_have_they_want"
  | "they_only"
  | "i_only";

export interface CollectionDiffRow {
  official_item_id: string;
  diff_type: DiffType;
}

// 以前はタブの印が絵文字（🤝💖🎁👀📦）で、色も pink-50 / violet-50 の直書きが混ざっていた。
// 印は lucide、色は意味のトークンだけにそろえる。
export const DIFF_LABELS: Record<DiffType, { label: string; icon: LucideIcon; tone: string }> = {
  common: { label: "お互い所有", icon: Handshake, tone: "bg-success-soft text-success border-success/30" },
  they_have_i_want: { label: "相手所有・自分欲しい", icon: Heart, tone: "bg-primary/10 text-primary border-primary/20" },
  i_have_they_want: { label: "自分所有・相手欲しい", icon: Gift, tone: "bg-warning-soft text-warning border-warning/30" },
  they_only: { label: "相手のみ所有", icon: Eye, tone: "bg-info-soft text-info border-info/30" },
  i_only: { label: "自分のみ所有", icon: Package, tone: "bg-muted text-muted-foreground border-border" },
};
