// Stripe を呼ぶための小さな共通部品。
// SDK は使わず、REST（フォームエンコード）と署名の検証だけを自前で持つ。
// Edge Function の起動を軽く保てるのと、依存の更新に引きずられないため。

const STRIPE_API = "https://api.stripe.com/v1";

/** フォーム用に、入れ子のオブジェクト・配列を Stripe の記法 a[b][0]=c にする */
export function encodeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === "object") parts.push(encodeForm(v as Record<string, unknown>, `${name}[${i}]`));
        else parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else if (typeof value === "object") {
      parts.push(encodeForm(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

export class StripeNotConfigured extends Error {
  constructor() {
    super("STRIPE_SECRET_KEY is not set");
  }
}

export async function stripeRequest<T = any>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params?: Record<string, unknown>,
  opts?: { idempotencyKey?: string }
): Promise<T> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new StripeNotConfigured();

  let url = `${STRIPE_API}${path}`;
  const init: RequestInit = { method, headers: { Authorization: `Bearer ${key}` } };
  // 二重クリック・再送で同じものを2つ作らないための鍵（Stripe は同じ鍵なら同じ結果を返す）
  if (opts?.idempotencyKey) (init.headers as Record<string, string>)["Idempotency-Key"] = opts.idempotencyKey;
  if (params && method === "GET") {
    const q = encodeForm(params);
    if (q) url += `?${q}`;
  } else if (params) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = encodeForm(params);
  }
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? `Stripe error ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body as T;
}

/**
 * Webhook の署名を確かめる。
 * Stripe-Signature: t=<時刻>,v1=<HMAC-SHA256(secret, `${t}.${本文}`)>[,v1=...]
 * 古すぎるもの（再生攻撃）は tolerance 秒を超えたら拒否する。
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (!header) return false;
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") t = v;
    else if (k === "v1" && v) sigs.push(v);
  }
  const ts = Number(t);
  if (!t || !Number.isFinite(ts) || sigs.length === 0) return false;
  if (Math.abs(nowSec - ts) > toleranceSec) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // 長さが違えば即不一致。同じ長さは定数時間で比べる
  return sigs.some((s) => {
    if (s.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

const DEFAULT_SITE_URL = "https://collectify-main.vercel.app";
const DEFAULT_ALLOWED = [DEFAULT_SITE_URL, "http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173"];

/** 決済後に戻すURLの土台。リクエスト元が許可リストにあればそれ、なければ本番のURL */
export function siteOrigin(req: Request): string {
  const siteUrl = (Deno.env.get("SITE_URL") ?? DEFAULT_SITE_URL).replace(/\/$/, "");
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  const allowed = new Set([siteUrl, ...DEFAULT_ALLOWED, ...extra]);
  const origin = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  return allowed.has(origin) ? origin : siteUrl;
}

/** price の lookup_key（premium_monthly など）から、アプリのプランへ */
export function planFromLookupKey(key: string | null | undefined): "premium" | "premium_plus" | null {
  if (!key) return null;
  if (key.startsWith("premium_plus_")) return "premium_plus";
  if (key.startsWith("premium_")) return "premium";
  return null;
}

/**
 * Managed Payments（Stripe が販売者として税・不正対策・コンプライアンスを引き受ける仕組み）。
 * 口座の既定が有効だと、商品に税コード（tax_code）が無い価格では Checkout を作れない。
 * 使わない運用にしたい場合は、Edge Function の環境変数 STRIPE_MANAGED_PAYMENTS=false にする。
 */
export function managedPaymentsOverride(): Record<string, unknown> {
  return Deno.env.get("STRIPE_MANAGED_PAYMENTS") === "false" ? { managed_payments: { enabled: false } } : {};
}

/** ユーザーごとに Stripe の顧客を1つだけ持つ（購入のたびに顧客が増えないように） */
export async function ensureStripeCustomer(
  admin: any,
  user: { id: string; email?: string | null }
): Promise<string> {
  const { data: row } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  // 購読の記録に顧客IDが残っていれば、それを引き継ぐ
  const { data: sub } = await admin.from("user_subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  let customerId: string | null = sub?.stripe_customer_id ?? null;

  if (!customerId) {
    const created = await stripeRequest(
      "POST",
      "/customers",
      { email: user.email ?? undefined, metadata: { user_id: user.id } },
      { idempotencyKey: `customer:${user.id}` }
    );
    customerId = created.id as string;
  }
  await admin
    .from("stripe_customers")
    .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id", ignoreDuplicates: true });
  // 同時に作られた場合は、先に保存された方が正
  const { data: winner } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  return winner?.stripe_customer_id ?? customerId;
}
