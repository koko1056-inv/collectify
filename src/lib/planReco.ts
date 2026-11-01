// サブスク（プレミアム / プレミアム+）のおすすめを「いつ・どれくらいの間隔で」出すかの決まり。
//
// 画面（src/components/premium/PlanRecoHost.tsx）は、ここが「出してよい」と言ったときだけ出す。
// React も localStorage も触らない純粋な関数だけにして、scripts/test-plan-reco.mjs で確かめる。
//
// 出さない人:
//   - 契約中の人（プランの状態がまだ読めていないときも、契約中かもしれないので出さない）
//   - 公式サンプルアカウント（profiles.is_sample）
//   - アプリ内（iOS / Android）。プランは Web（Stripe）でしか買えず、アプリから外の決済へ誘うとストアの規約に反する
//   - はじめてのウェルカムを終えていない人
//   - 「もう表示しない」を選んだ人
//
// 間隔:
//   - どのきっかけでも、前に出してから MIN_GAP_DAYS（3日）は出さない
//   - 「あとで」・×・プランを見ただけで閉じた → SNOOZE_DAYS（7日）は出さない
//   - 「たくさん使ってくれてありがとう」（activeDays）は1回きり
//
// ポイント不足の確認ダイアログの中の小さな案内（SpendPointsDialog）は、文脈上必要なのでこの間隔の外。
// ただし契約中・サンプル・アプリ内では出さない（canShowInlinePlanHint）。

export const DAY_MS = 24 * 60 * 60 * 1000;

/** どのきっかけでも、前に出してからこれだけは空ける */
export const MIN_GAP_DAYS = 3;
/** 「あとで」・閉じたときに休む日数 */
export const SNOOZE_DAYS = 7;
/** 残高がこれを下回ったら「少なくなってきたね」 */
export const LOW_BALANCE_THRESHOLD = 30;
/**
 * コレクションの節目。バッジ（collector: 1 / 10 / 50 / 200）のお祝いと同じ瞬間に重ならない数にしている。
 * お祝いのすぐあとにプランの話が続くと、せっかくの喜びが押し売りに変わってしまうため。
 */
export const COLLECTION_MILESTONES = [30, 100, 300] as const;
/** はじめて使ってからこの日数がたち… */
export const ACTIVE_MIN_DAYS_SINCE_FIRST = 7;
/** …この日数以上アプリを開いてくれていたら */
export const ACTIVE_MIN_DAYS_USED = 5;
/** 端末に覚えておく「使った日」の上限（古いものから捨てる） */
export const ACTIVE_DAYS_KEEP = 60;

export type PlanRecoTrigger = "lowBalance" | "insufficient" | "milestone" | "activeDays" | "onboarding";

export interface PlanRecoState {
  /** 最後に出した時刻（ms）。0 = まだ */
  lastShownAt: number;
  /** この時刻までは出さない（ms） */
  snoozeUntil: number;
  /** 「もう表示しない」 */
  optedOut: boolean;
  /** 「たくさん使ってくれて」を出した時刻（1回きり） */
  activeDaysShownAt: number;
}

export const INITIAL_PLAN_RECO_STATE: PlanRecoState = {
  lastShownAt: 0,
  snoozeUntil: 0,
  optedOut: false,
  activeDaysShownAt: 0,
};

export interface PlanRecoAudience {
  /** ログインしている */
  signedIn: boolean;
  /** プランの状態を読み終えた（読めていないあいだは契約中かもしれないので出さない） */
  subscriptionKnown: boolean;
  /** 契約中 */
  isSubscriber: boolean;
  /** 公式サンプルアカウント（読めていないあいだは null。サンプルかもしれないので出さない） */
  isSample: boolean | null;
  /** この端末でプランを買える（Web） */
  canPurchase: boolean;
}

/** そもそもこの人にプランの話をしてよいか（間隔とは関係なく） */
export function isPlanRecoAudience(a: PlanRecoAudience): boolean {
  return a.signedIn && a.subscriptionKnown && !a.isSubscriber && a.isSample === false && a.canPurchase;
}

/** ポイント不足のダイアログの中の小さな案内を出してよいか（間隔・「もう表示しない」の外） */
export function canShowInlinePlanHint(a: PlanRecoAudience): boolean {
  return isPlanRecoAudience(a);
}

export interface PlanRecoDecisionInput {
  audience: PlanRecoAudience;
  /** はじめてのウェルカムを終えている */
  welcomeDone: boolean;
  state: PlanRecoState;
  trigger: PlanRecoTrigger;
  now: number;
}

export type PlanRecoBlock =
  | "audience"
  | "welcome"
  | "optedOut"
  | "snoozed"
  | "tooSoon"
  | "alreadyShown";

/** このきっかけで、いまアプリの中のおすすめ（シート）を出してよいか。だめなら理由 */
export function decidePlanReco(input: PlanRecoDecisionInput): { show: true } | { show: false; reason: PlanRecoBlock } {
  const { audience, welcomeDone, state, trigger, now } = input;
  if (!isPlanRecoAudience(audience)) return { show: false, reason: "audience" };
  // ウェルカムの中のおすすめは、ウェルカムが自分で出す（ここは「終えた後」のアプリの中の話）
  if (trigger !== "onboarding" && !welcomeDone) return { show: false, reason: "welcome" };
  if (state.optedOut) return { show: false, reason: "optedOut" };
  if (now < state.snoozeUntil) return { show: false, reason: "snoozed" };
  if (state.lastShownAt > 0 && now - state.lastShownAt < MIN_GAP_DAYS * DAY_MS) return { show: false, reason: "tooSoon" };
  if (trigger === "activeDays" && state.activeDaysShownAt > 0) return { show: false, reason: "alreadyShown" };
  return { show: true };
}

/** 出したとき */
export function markShown(state: PlanRecoState, trigger: PlanRecoTrigger, now: number): PlanRecoState {
  return {
    ...state,
    lastShownAt: now,
    activeDaysShownAt: trigger === "activeDays" ? now : state.activeDaysShownAt,
  };
}

/** 「あとで」・×・外側をタップして閉じた・プランを見ただけで閉じた */
export function markSnoozed(state: PlanRecoState, now: number): PlanRecoState {
  return { ...state, snoozeUntil: Math.max(state.snoozeUntil, now + SNOOZE_DAYS * DAY_MS) };
}

/** 「もう表示しない」 */
export function markOptedOut(state: PlanRecoState): PlanRecoState {
  return { ...state, optedOut: true };
}

/** 端末に保存した値を読み直す。壊れていても既定値に戻すだけで、例外は出さない */
export function parsePlanRecoState(raw: string | null | undefined): PlanRecoState {
  if (!raw) return { ...INITIAL_PLAN_RECO_STATE };
  try {
    const v = JSON.parse(raw) as Partial<PlanRecoState> | null;
    if (!v || typeof v !== "object") return { ...INITIAL_PLAN_RECO_STATE };
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 0);
    return {
      lastShownAt: num(v.lastShownAt),
      snoozeUntil: num(v.snoozeUntil),
      optedOut: v.optedOut === true,
      activeDaysShownAt: num(v.activeDaysShownAt),
    };
  } catch {
    return { ...INITIAL_PLAN_RECO_STATE };
  }
}

// ─────────────────────────── きっかけの見つけ方 ───────────────────────────

/**
 * 残高が「少なくなった」瞬間か。使って減ったとき（prev → next が減った）に、しきい値をまたいだときだけ。
 * はじめから少ない人に、開くたびに言わないため。prev が null（読み込んだばかり）のときは言わない。
 */
export function crossedLowBalance(prev: number | null, next: number | null, threshold = LOW_BALANCE_THRESHOLD): boolean {
  if (prev === null || next === null) return false;
  return next < prev && prev >= threshold && next < threshold;
}

/**
 * コレクションの節目をまたいだか。seenMax は「もう知っている一番大きな節目」（端末に覚えておく）。
 *   - seenMax が null（この端末で初めて数えた）: 今の数までの節目を「知っている」にするだけで、言わない
 *   - 減ったとき（グッズを消した）は下げない（もう一度またいでも二度は言わない）
 * 一度に2つまたいだときは、大きいほうだけを言う。
 */
export function crossedMilestone(
  seenMax: number | null,
  count: number,
  milestones: readonly number[] = COLLECTION_MILESTONES
): { milestone: number | null; seenMax: number } {
  const reached = milestones.filter((m) => count >= m);
  const top = reached.length > 0 ? Math.max(...reached) : 0;
  if (seenMax === null) return { milestone: null, seenMax: top };
  if (top > seenMax) return { milestone: top, seenMax: top };
  return { milestone: null, seenMax };
}

/** 日本時間の日付（YYYY-MM-DD）。使った日を数えるのに使う */
export function jstDay(ms: number): string {
  return new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 使った日に今日を足す（重ねない・新しい順に ACTIVE_DAYS_KEEP 日まで） */
export function recordActiveDay(days: readonly string[], now: number): string[] {
  const today = jstDay(now);
  const set = new Set(days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  set.add(today);
  return [...set].sort().reverse().slice(0, ACTIVE_DAYS_KEEP);
}

/**
 * 「たくさん使ってくれた」か。firstUsedAt（はじめて使った時刻。アカウントの作成日など）から
 * ACTIVE_MIN_DAYS_SINCE_FIRST 日以上たち、ACTIVE_MIN_DAYS_USED 日以上開いてくれていたら。
 */
export function isActiveEnough(firstUsedAt: number | null, days: readonly string[], now: number): boolean {
  if (!firstUsedAt || firstUsedAt > now) return false;
  if (now - firstUsedAt < ACTIVE_MIN_DAYS_SINCE_FIRST * DAY_MS) return false;
  return new Set(days).size >= ACTIVE_MIN_DAYS_USED;
}

// ─────────────────────────── プランの選び方 ───────────────────────────

export type RecoPlan = "premium" | "premium_plus";

/**
 * はじめに選んでおくプラン。月のグッズ予算に 1万円以上と答えた人（AI もたくさん使いそうな人）には
 * プレミアム+、それ以外（答えていない・ないしょ を含む）はプレミアム。押し付けず、選び直せる。
 */
export function suggestedPlan(monthlyBudget: string | null | undefined): RecoPlan {
  return monthlyBudget === "10k_30k" || monthlyBudget === "30k_plus" ? "premium_plus" : "premium";
}
