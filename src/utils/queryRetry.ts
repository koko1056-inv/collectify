/**
 * 読み込み（React Query）の再試行のきまり。
 *
 * 以前は失敗の種類に関係なく 2 回すぐ再試行していた。DB の時間切れ（8 秒）のときは、
 * 同じ重い問い合わせをすぐ投げ直してさらに混ませ、権限なし・見つからない（何度やっても同じ）にも
 * 待たせてから「データの読み込みに失敗しました」を出していた。
 *  - 一時的な失敗（通信・5xx・時間切れ 57014 など）だけ、間をあけて（1秒 → 2秒 → 最大4秒・ゆらぎ付き）再試行する
 *  - 4xx・権限・見つからない・入力の誤りなどは再試行しない
 */

/** 最大の再試行回数（最初の1回と合わせて 3 回まで） */
export const MAX_QUERY_RETRIES = 2;

/** 一時的な失敗とみなす Postgres / PostgREST のコード */
const TRANSIENT_CODES = new Set([
  "57014", // statement_timeout（時間切れ）
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
  "53400", // configuration_limit_exceeded
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "08000", // connection_exception
  "08003",
  "08006",
  "PGRST000", // DB に接続できない（503）
  "PGRST001",
  "PGRST002", // スキーマキャッシュを作れない（503）
]);

/** 通信の失敗・時間切れらしい文言（Safari は "Load failed"、Chrome は "Failed to fetch"） */
const TRANSIENT_MESSAGE =
  /failed to fetch|fetch failed|load failed|network ?error|networkerror|timed? ?out|timeout|statement timeout|econnreset|socket hang up|upstream|bad gateway|service unavailable|gateway time-?out/i;

type ErrorLike = {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
  context?: { status?: unknown } | null;
};

function statusOf(e: ErrorLike): number | null {
  const s = typeof e.status === "number" ? e.status : typeof e.context?.status === "number" ? e.context.status : null;
  return s;
}

/** 時間をおけば通りそうな失敗か */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") return TRANSIENT_MESSAGE.test(error);
  if (typeof error !== "object") return false;
  const e = error as ErrorLike;

  const status = statusOf(e);
  if (status !== null) {
    if (status === 0 || status === 408 || status === 425 || status === 429 || status >= 500) return true;
    if (status >= 400) return false;
  }

  const code = typeof e.code === "string" ? e.code : "";
  if (code && TRANSIENT_CODES.has(code)) return true;

  const message = typeof e.message === "string" ? e.message : "";
  if (TRANSIENT_MESSAGE.test(message)) return true;
  // fetch そのものが落ちたとき（オフライン・接続が切れた）は TypeError になる
  if (e.name === "TypeError" && !code) return /fetch|load|network/i.test(message) || message === "";

  return false;
}

/** React Query の retry に渡す */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && isTransientError(error);
}

/** React Query の retryDelay に渡す。1秒・2秒・4秒（上限）に、混み合いを避けるためのゆらぎ（0〜30%）を足す */
export function queryRetryDelay(attemptIndex: number, random: () => number = Math.random): number {
  const base = Math.min(1000 * 2 ** attemptIndex, 4000);
  return Math.round(base * (1 + 0.3 * random()));
}
