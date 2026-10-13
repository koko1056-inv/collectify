/**
 * なかよしレベルの特典（推しグッズのレベルが上がると、何がもらえて・何が変わるか）。絵を描かない、純粋な部分。
 *
 * 以前は Lv5 と Lv10 で少しポイントが出るだけで、「育てると何がいいのか」が見えなかった。いまは4つの特典がある:
 *  - ポイント: すべてのレベルアップで（DB の point_rewards companion_lv2〜10 と同じ値。1グッズ1レベル1回）
 *  - 部屋のアイテム: Lv3・5・7・10 で、そのレベルでしか手に入らない家具・壁紙・床・フレーム（アカウント単位。lib/oshiRoom.ts の LEVEL_SETS）
 *  - 反応: レベル帯ごとに、タップ・お世話したときの反応と待機の動きが豊かになる（ハート → ひとこと → 音符・ジャンプ → 虹）
 *  - 自慢: プロフィールと他の人が見る部屋に、レベル・称号を出す
 *
 * ポイントの表は DB（20261013100100_oshi_level_rewards.sql）が正。ここは画面に「次のレベルで +10pt」と出すための写し
 * （scripts/test-oshi-room.mjs が migration と突き合わせる）。
 * このファイルは node のテストからも読むので、React や "@/..." を import しない。
 */

import { LEVEL_SETS, ROOM_ASSETS, type LevelSet } from "./oshiRoom.ts";

export const MAX_COMPANION_LEVEL = 10;

/** レベル → そのレベルに上がったときのポイント */
export const LEVEL_POINTS: Record<number, number> = { 2: 3, 3: 5, 4: 5, 5: 10, 6: 10, 7: 15, 8: 15, 9: 20, 10: 30 };

/**
 * 反応の段階。
 *  1: ハートだけ（Lv1〜3）
 *  2: ひとことの吹き出し（Lv4〜6）。待機中もときどき吹き出し
 *  3: 音符・きらめき・ジャンプ（Lv7〜9）。待機中もときどき跳ねる
 *  4: 虹のきらめき（Lv10）。待機中はいつも淡いオーラ
 */
export type ReactionTier = 1 | 2 | 3 | 4;

export function reactionTier(level: number): ReactionTier {
  if (level >= 10) return 4;
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  return 1;
}

/** 反応の段階が上がるレベル（「次のレベルで: ひとことを話す」のように見せる） */
export const TIER_START: Record<ReactionTier, number> = { 1: 1, 2: 4, 3: 7, 4: 10 };

/** そのレベルで解放される特典のセット（無ければ null） */
export function levelSetAt(level: number): LevelSet | null {
  for (const [set, lv] of Object.entries(LEVEL_SETS) as [LevelSet, number][]) if (lv === level) return set;
  return null;
}

/** そのレベルで解放される部屋のアイテムの key（目録の並び） */
export function levelItemsAt(level: number): string[] {
  const set = levelSetAt(level);
  return set ? ROOM_ASSETS.filter((a) => a.set === set).map((a) => a.key) : [];
}

export interface LevelReward {
  level: number;
  points: number;
  /** 解放されるセット（Lv3・5・7・10） */
  set: LevelSet | null;
  /** そのセットの中身（目録の key） */
  items: string[];
  /** このレベルで反応の段階が上がるなら、その段階 */
  tier: ReactionTier | null;
}

export function rewardAt(level: number): LevelReward | null {
  if (level < 2 || level > MAX_COMPANION_LEVEL) return null;
  const tier = reactionTier(level);
  return {
    level,
    points: LEVEL_POINTS[level] ?? 0,
    set: levelSetAt(level),
    items: levelItemsAt(level),
    tier: TIER_START[tier] === level ? tier : null,
  };
}

/** Lv2〜10 の特典の一覧（特典の表に使う） */
export const LEVEL_REWARDS: LevelReward[] = Array.from({ length: MAX_COMPANION_LEVEL - 1 }, (_, i) => rewardAt(i + 2)!);

/**
 * サーバーが返した特典（companion_apply / give_companion_gift の rewards）。
 * 古いサーバー（rewards を返さない）や、通信の形が変でも落ちないように読む
 */
export interface ServerRewards {
  points: number;
  /** 今回はじめて解放したセット（lv3 など） */
  unlocked: LevelSet[];
}

export function parseRewards(raw: unknown): ServerRewards | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { points?: unknown; unlocked?: unknown };
  const points = typeof r.points === "number" && Number.isFinite(r.points) ? r.points : 0;
  const unlocked = Array.isArray(r.unlocked) ? r.unlocked.filter((s): s is LevelSet => typeof s === "string" && s in LEVEL_SETS) : [];
  return { points, unlocked };
}

/**
 * サーバーの答えが無いとき（撮った写真の保存からのレベルアップなど）の見込み。
 * old → new の間のレベルのポイントの合計と、まだ持っていないセット
 */
export function expectedRewards(oldLevel: number, newLevel: number, owned: ReadonlySet<string>): ServerRewards {
  let points = 0;
  const unlocked: LevelSet[] = [];
  for (let lv = Math.max(2, oldLevel + 1); lv <= Math.min(newLevel, MAX_COMPANION_LEVEL); lv++) {
    points += LEVEL_POINTS[lv] ?? 0;
    const set = levelSetAt(lv);
    if (set && !owned.has(`room:${set}`)) unlocked.push(set);
  }
  return { points, unlocked };
}

/** 自慢の札に使う数（推しグッズのレベルの合計と、いちばん高いレベル） */
export function bondSummary(levels: number[]): { total: number; best: number } {
  return { total: levels.reduce((s, v) => s + v, 0), best: levels.reduce((m, v) => Math.max(m, v), 0) };
}

/** ひとことの数（翻訳の oshiRoom.lines.<段階>.<1..n>） */
export const LINE_COUNT = 5;
const TIER_LINE_GROUP: Record<ReactionTier, "low" | "mid" | "high" | "max"> = { 1: "low", 2: "mid", 3: "high", 4: "max" };

/**
 * ひとことの翻訳キーを選ぶ。直前と同じ言葉が続かないよう、前回の番号を受け取って避ける。
 * 段階1（ハートだけ）は言葉を出さないので null
 */
export function pickLine(tier: ReactionTier, rand: number, prev?: number): { key: string; n: number } | null {
  if (tier < 2) return null;
  let n = 1 + Math.floor(Math.max(0, Math.min(0.999999, rand)) * LINE_COUNT);
  if (prev && n === prev) n = (n % LINE_COUNT) + 1;
  return { key: `oshiRoom.lines.${TIER_LINE_GROUP[tier]}.${n}`, n };
}

/** 待機の揺れの大きさ（部屋の単位の px）。レベルが上がるほど、少しずつ大きく・楽しげに */
export function idleBob(level: number): number {
  const tier = reactionTier(level);
  return tier === 4 ? 4.5 : tier === 3 ? 4 : tier === 2 ? 3.2 : 2.5;
}
