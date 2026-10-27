/**
 * Edge Function が 429（{ error: "rate_limited", retryAfterSec, limitedBy }）を返したかを
 * supabase.functions.invoke の error から読み取る（_shared/rate-limit.ts の rateLimitExceededResponse）。
 *
 * invoke は 2xx 以外を FunctionsHttpError にして、元の Response を error.context に入れて返す。
 */
export interface FunctionsRateLimit {
  retryAfterSec: number;
  /** どちらの上限に当たったか。古い形の 429（AI の混雑など）は "hour" 扱い */
  limitedBy: "hour" | "day";
}

export async function readFunctionsRateLimit(error: unknown): Promise<FunctionsRateLimit | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response) || context.status !== 429) return null;

  let body: { retryAfterSec?: unknown; limitedBy?: unknown } | null = null;
  try {
    body = await context.clone().json();
  } catch {
    body = null;
  }
  const header = Number(context.headers.get("Retry-After"));
  const retryAfterSec = Number(body?.retryAfterSec) || (Number.isFinite(header) && header > 0 ? header : 60);
  return { retryAfterSec, limitedBy: body?.limitedBy === "day" ? "day" : "hour" };
}
