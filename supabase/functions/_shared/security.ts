// 認証・CORS・レート制限の共通部品
//
// generate-avatar / delete-official-item が各ファイルに書いていた認証の型
// （Authorization ヘッダ → anon キーのクライアント + auth.getUser()）を1か所にまとめたもの。
// verify_jwt = true だけでは「anon キーだけを持つ呼び出し」も通ってしまうので、
// 関数の中で必ず auth.getUser() を通してログイン中のユーザーであることを確かめる。

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ────────────────────────────── CORS ──────────────────────────────

const DEFAULT_SITE_URL = "https://collectify-main.vercel.app";

/**
 * 既定で許可するオリジン。"*" は1ラベル分（英数字とハイフン、ポートなら数字）に一致する。
 * 追加は Edge Function の環境変数 ALLOWED_ORIGINS（カンマ区切り）で行う。
 * 例: ALLOWED_ORIGINS=https://collectify-main-*.vercel.app,https://collectify.example
 * （stripe.ts の siteOrigin と同じ変数名・同じ形式）
 */
const DEFAULT_ALLOWED_ORIGINS = [
  DEFAULT_SITE_URL,
  "http://localhost:*", // vite dev（5173 / 8080 など）
  "http://127.0.0.1:*",
  "capacitor://localhost", // iOS アプリ（Capacitor）
  "https://localhost",
  "ionic://localhost",
];

const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function allowedOriginPatterns(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const site = (Deno.env.get("SITE_URL") ?? "").trim().replace(/\/$/, "");
  return [...DEFAULT_ALLOWED_ORIGINS, ...(site ? [site] : []), ...extra];
}

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[A-Za-z0-9-]*");
  return new RegExp(`^${escaped}$`);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOriginPatterns().some((p) => patternToRegExp(p).test(origin));
}

/**
 * リクエスト元が許可リストにあるときだけ Access-Control-Allow-Origin を付ける。
 * ブラウザ以外（Origin ヘッダなし）の呼び出しは CORS の対象外なのでそのまま処理される。
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function jsonResponse(
  cors: Record<string, string>,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extraHeaders },
  });
}

// ────────────────────────────── 認証 ──────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface AuthedUser {
  id: string;
  email?: string | null;
}

export type AuthResult =
  | { ok: true; user: AuthedUser; userClient: SupabaseClient }
  | { ok: false; response: Response };

/**
 * ログイン中のユーザーであることを auth.getUser() で確かめる。
 * Authorization が無い・anon キーだけ・期限切れ・偽造のどれでも 401。
 */
export async function requireUser(req: Request, cors: Record<string, string>): Promise<AuthResult> {
  const unauthorized = () => ({
    ok: false as const,
    response: jsonResponse(cors, { error: "ログインが必要です" }, 401),
  });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return unauthorized();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("requireUser: SUPABASE_URL / SUPABASE_ANON_KEY is not configured");
    return { ok: false, response: jsonResponse(cors, { error: "サーバーの設定エラーです" }, 500) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return unauthorized();

  return { ok: true, user: { id: data.user.id, email: data.user.email }, userClient };
}

/** requireUser に加えて、has_role('admin') を確かめる（delete-official-item と同じ方法）。 */
export async function requireAdmin(req: Request, cors: Record<string, string>): Promise<AuthResult> {
  const auth = await requireUser(req, cors);
  if (!auth.ok) return auth;

  const { data: isAdmin, error } = await auth.userClient.rpc("has_role", {
    _user_id: auth.user.id,
    _role: "admin",
  });
  if (error || isAdmin !== true) {
    if (error) console.error("requireAdmin: has_role failed:", error.message);
    return { ok: false, response: jsonResponse(cors, { error: "この操作には管理者権限が必要です" }, 403) };
  }
  return auth;
}

// ────────────────────────────── レート制限 ──────────────────────────────

// TODO: これは Edge Function のインスタンスごとのメモリ上で数えるだけの暫定版。
//       インスタンスが増える・再起動する・コールドスタートするたびに数え直しになるので、
//       上限を「確実に」守れる保証はない（連打や単純な濫用を鈍らせる程度）。
//       本番で確実に効かせるなら、DB（呼び出し履歴テーブル + RPC）か Upstash などの
//       共有ストアでユーザーごとに数えること。ポイントを消費する関数は
//       generate-avatar のようにポイント課金で縛るのが確実。
const rateBuckets = new Map<string, number[]>();
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/** key（例: "generate-background:<userId>"）ごとに、windowMs の間に limit 回まで。 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (rateBuckets.size > MAX_BUCKETS) {
    for (const [k, stamps] of rateBuckets) {
      if (stamps.length === 0 || now - stamps[stamps.length - 1] > windowMs) rateBuckets.delete(k);
    }
    // 掃除しても多すぎるなら全部捨てる（メモリを青天井にしない）
    if (rateBuckets.size > MAX_BUCKETS) rateBuckets.clear();
  }

  const recent = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    rateBuckets.set(key, recent);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

/** 制限に達したときの 429 レスポンス。 */
export function rateLimitedResponse(cors: Record<string, string>, retryAfterSec: number): Response {
  return jsonResponse(
    cors,
    { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
    429,
    { "Retry-After": String(retryAfterSec) }
  );
}

/** JSON ボディを読む。壊れていれば null。 */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
