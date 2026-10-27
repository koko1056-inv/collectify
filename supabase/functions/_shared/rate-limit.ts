// ユーザー単位のレート制限（DB で数える。全インスタンス共通）
//
// security.ts の checkRateLimit はインスタンスごとのメモリで数えるだけなので、
// 「1時間に20回・1日に100回まで」のような上限は守れない。こちらは
// public.consume_rate_limit（migrations/20261027210000_edge_rate_limits.sql）を service role で呼び、
// 数える・断る・記録するを DB の中で1回にまとめて行う。
//
//   const limit = await consumeRateLimit(supabaseAdmin, auth.user.id, "scrape-images", { hour: 20, day: 100 });
//   if (!limit.ok) return rateLimitExceededResponse(corsHeaders, limit);
//
// 管理者を除外するかどうかは呼び出し側で決める（security.ts の isAdminUser）。

import { checkRateLimit, jsonResponse } from "./security.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface RateLimits {
  /** 1時間あたりの上限 */
  hour: number;
  /** 1日（24時間）あたりの上限 */
  day: number;
}

export type RateLimitWindow = "hour" | "day";

export type ConsumeResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; limitedBy: RateLimitWindow };

/**
 * 1回分を数える。上限内なら記録して ok: true、上限なら記録せずに ok: false。
 *
 * DB に届かない（RPC のエラー・マイグレーション未適用など）ときは、関数ごと止めないように
 * インスタンス内メモリの制限（1時間の上限）に切り替える。完全ではないが、青天井にはしない。
 */
export async function consumeRateLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  fn: string,
  limits: RateLimits
): Promise<ConsumeResult> {
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_user_id: userId,
    p_fn: fn,
    p_hour_limit: limits.hour,
    p_day_limit: limits.day,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || typeof row.allowed !== "boolean") {
    console.error("consumeRateLimit: consume_rate_limit failed, falling back to in-memory limit:", error?.message ?? "no row");
    const fallback = checkRateLimit(`${fn}:${userId}`, limits.hour, 60 * 60 * 1000);
    return fallback.ok ? { ok: true } : { ok: false, retryAfterSec: fallback.retryAfterSec, limitedBy: "hour" };
  }

  if (row.allowed) return { ok: true };
  return {
    ok: false,
    retryAfterSec: Math.max(1, Number(row.retry_after_sec) || 60),
    limitedBy: row.limited_by === "day" ? "day" : "hour",
  };
}

/**
 * 上限に達したときの 429。フロントは error === "rate_limited" と limitedBy で文言を出し分ける。
 * Retry-After ヘッダと本文の retryAfterSec は同じ値。
 */
export function rateLimitExceededResponse(
  cors: Record<string, string>,
  result: { retryAfterSec: number; limitedBy: RateLimitWindow }
): Response {
  return jsonResponse(
    cors,
    { error: "rate_limited", retryAfterSec: result.retryAfterSec, limitedBy: result.limitedBy },
    429,
    { "Retry-After": String(result.retryAfterSec) }
  );
}

/**
 * rateLimitExceededResponse と同じ 429 だが、error に画面へそのまま出せる文言を入れる版。
 * 本文の error をそのまま表示している既存の画面（edit-image・generate-ai-room など）向け。
 * 種類は code === "rate_limited" と limitedBy で見分けられる。
 */
export function rateLimitExceededMessageResponse(
  cors: Record<string, string>,
  result: { retryAfterSec: number; limitedBy: RateLimitWindow }
): Response {
  const error = result.limitedBy === "day"
    ? "今日の利用回数の上限に達しました。明日またお試しください。"
    : "利用回数の上限に達しました。しばらくしてからお試しください。";
  return jsonResponse(
    cors,
    { error, code: "rate_limited", retryAfterSec: result.retryAfterSec, limitedBy: result.limitedBy },
    429,
    { "Retry-After": String(result.retryAfterSec) }
  );
}
