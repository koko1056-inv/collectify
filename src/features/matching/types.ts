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

export const DIFF_LABELS: Record<DiffType, { label: string; emoji: string; tone: string }> = {
  common: { label: "お互い所有", emoji: "🤝", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  they_have_i_want: { label: "相手所有・自分欲しい", emoji: "💖", tone: "bg-pink-50 text-pink-700 border-pink-200" },
  i_have_they_want: { label: "自分所有・相手欲しい", emoji: "🎁", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  they_only: { label: "相手のみ所有", emoji: "👀", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  i_only: { label: "自分のみ所有", emoji: "📦", tone: "bg-slate-50 text-slate-700 border-slate-200" },
};
