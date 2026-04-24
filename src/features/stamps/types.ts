export type StampType =
  | "same_oshi"
  | "nice_goods"
  | "congrats"
  | "trade_interest"
  | "helpful"
  | "hello";

export type StampContext = "item" | "profile" | "match" | "comment";

export interface StampMeta {
  type: StampType;
  emoji: string;
  label: string;
  description: string;
}

export const STAMPS: StampMeta[] = [
  { type: "hello",          emoji: "👋", label: "はじめまして",   description: "気軽にあいさつ" },
  { type: "same_oshi",      emoji: "💖", label: "同担です！",     description: "同じ推しを応援中" },
  { type: "nice_goods",     emoji: "✨", label: "そのグッズ素敵", description: "コレクションに感動" },
  { type: "congrats",       emoji: "🎉", label: "コンプおめでとう", description: "コンプリート達成" },
  { type: "trade_interest", emoji: "🔄", label: "トレード興味あり", description: "交換したいかも" },
  { type: "helpful",        emoji: "🙏", label: "参考にします",   description: "情報ありがとう" },
];

export const STAMP_BY_TYPE: Record<StampType, StampMeta> = STAMPS.reduce(
  (acc, s) => ({ ...acc, [s.type]: s }),
  {} as Record<StampType, StampMeta>,
);
