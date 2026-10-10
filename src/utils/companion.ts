/**
 * 相棒グッズの成長（なかよし度）。xp とレベルの計算は DB の companion_level() と揃える。
 * 見た目の変化（枠）はレベルで決まる。放置しても xp は減らない。
 */

/** レベルn に必要な累積 xp（Lv1 は 0）。DB: companion_level() と同じ */
export const LEVEL_XP = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150] as const;
export const MAX_LEVEL = LEVEL_XP.length;
/** 1日に上げられる xp: 撫でる 1 + 磨く 1 + 撮る 3 */
export const DAILY_MAX_XP = 5;
export const MAX_COMPANIONS = 3;

export function levelFromXp(xp: number): number {
  return LEVEL_XP.filter((x) => x <= Math.max(xp, 0)).length;
}

export interface LevelProgress {
  level: number;
  /** 今のレベルに入ってからの xp */
  into: number;
  /** 次のレベルまでに必要な xp（最大レベルなら 0） */
  needed: number;
  /** 0〜1 */
  ratio: number;
  isMax: boolean;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, needed: 0, ratio: 1, isMax: true };
  const base = LEVEL_XP[level - 1];
  const next = LEVEL_XP[level];
  return { level, into: xp - base, needed: next - base, ratio: (xp - base) / (next - base), isMax: false };
}

/** レベルに応じた枠（グラデーションの輪）。高いほど華やかになる */
export function frameClass(level: number): string {
  if (level >= 10) return "bg-[conic-gradient(from_0deg,#f472b6,#fbbf24,#34d399,#60a5fa,#a78bfa,#f472b6)] shadow-[0_0_18px_rgba(244,114,182,0.55)]";
  if (level >= 7) return "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.5)]";
  if (level >= 5) return "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.5)]";
  if (level >= 3) return "bg-gradient-to-br from-orange-300 to-amber-600";
  return "bg-border";
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(now: number = Date.now()): string {
  return new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
}

/** 日付（YYYY-MM-DD）の集合から、今日（または昨日）までの連続日数を数える */
export function streakFromDates(dates: Iterable<string>, now: number = Date.now()): { streak: number; today: boolean } {
  const set = new Set(dates);
  const today = todayJst(now);
  const has = (d: string) => set.has(d);
  const shift = (d: string, days: number) => new Date(Date.parse(d + "T00:00:00Z") + days * 86400e3).toISOString().slice(0, 10);
  const todayDone = has(today);
  // 今日まだ撮っていなくても、昨日までの連続は途切れていない扱い
  let cursor = todayDone ? today : shift(today, -1);
  let streak = 0;
  while (has(cursor)) {
    streak++;
    cursor = shift(cursor, -1);
  }
  return { streak, today: todayDone };
}
