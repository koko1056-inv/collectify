// 退会（アカウントの完全削除）。
// App Store 5.1.1(v)・GDPR・個人情報保護法への対応として、アプリ内から本人が実行できる。
//
// 手順:
//   1) 本人確認（JWT）と、確認文字列 {"confirm":"DELETE"} の検査
//   2) 管理者は拒否（先に権限を外してもらう）
//   3) Stripe の購読を即時解約（失敗したら削除しない。課金が続くのを防ぐ）
//   4) 進行中の交換を取り消す（相手に通知が飛ぶ）
//   5) Storage の画像を削除（<uid>/ 配下 + 自分の行が指す自前ホストのファイル）
//   6) 外部キーが無く連鎖で消えない表（ポイント・通知など）を削除
//   7) auth.users を削除（profiles 以下は ON DELETE CASCADE / SET NULL で連鎖。
//      supabase/migrations/20261011000000_account_deletion_support.sql が前提）
//   8) Stripe の顧客情報を削除（ベストエフォート。請求の記録は Stripe 側に法定期間残る）
//
// どの段階で失敗しても、やり直せるようにしてある（同じ操作をもう一度呼べば続きから消える）。

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stripeRequest, StripeNotConfigured } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class StepError extends Error {
  constructor(public code: string, public status = 500, detail?: unknown) {
    super(code);
    if (detail) console.error(`delete-account step failed: ${code}`, detail);
  }
}

// ユーザーがファイルを置けるバケット
const BUCKETS = ["profile_images", "kuji_images", "item-posts", "ai-rooms"] as const;
const MAX_LIST_PAGES = 50; // 1ページ100件 × 50 = 1バケット5000件まで
const MAX_REF_URLS = 2000;

/** 外部キーが無く、本人が消えても残ってしまう表。(表, 列) */
const ORPHAN_TABLES: Array<[string, string]> = [
  ["ai_room_likes", "user_id"],
  ["ai_work_bookmarks", "user_id"],
  ["avatar_likes", "user_id"],
  ["binders", "user_id"],
  ["comment_likes", "user_id"],
  ["greeting_stamps", "sender_id"],
  ["greeting_stamps", "receiver_id"],
  ["iap_transactions", "user_id"],
  ["item_comment_reactions", "user_id"],
  ["item_comments", "user_id"],
  ["item_room_messages", "user_id"],
  ["match_actions", "user_id"],
  ["match_scores", "user_id"],
  ["notifications", "user_id"],
  ["onboarding_rewards", "user_id"],
  ["point_reward_claims", "user_id"],
  ["point_transactions", "user_id"],
  ["trade_reviews", "reviewer_id"],
  ["trade_reviews", "reviewee_id"],
  ["user_limits", "user_id"],
  ["user_point_purchases", "user_id"],
  ["user_points", "user_id"],
  ["user_trust_scores", "user_id"],
];

/** 共有データに残る「作成者」だけを外す表。(表, 列) */
const DETACH_COLUMNS: Array<[string, string]> = [
  ["tag_aliases", "created_by"],
  ["frame_presets", "created_by"],
  ["sticker_presets", "created_by"],
  ["tag_candidates", "reviewed_by"],
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "login_required" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "login_required" }, 401);
  const uid = userRes.user.id;

  // 事故防止: 画面で打ってもらう確認文字列
  let body: { confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (body?.confirm !== "DELETE") return json({ error: "confirmation_required" }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const warnings: string[] = [];

  try {
    // (a) 管理者は拒否。先に権限を外してもらう（最後の管理者を消してしまう事故も防ぐ）
    const [{ data: prof, error: profErr }, { data: roles, error: roleErr }] = await Promise.all([
      admin.from("profiles").select("is_admin").eq("id", uid).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").limit(1),
    ]);
    if (profErr || roleErr) throw new StepError("lookup_failed", 500, profErr ?? roleErr);
    if (prof?.is_admin === true || (roles?.length ?? 0) > 0) {
      return json({ error: "admin_cannot_delete" }, 403);
    }

    // (b) 購読
    const { data: sub, error: subErr } = await admin
      .from("user_subscriptions")
      .select("plan, status, platform, expires_at, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (subErr) throw new StepError("lookup_failed", 500, subErr);
    const { data: scRow } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", uid).maybeSingle();
    const stripeCustomerId: string | null = scRow?.stripe_customer_id ?? sub?.stripe_customer_id ?? null;

    if (sub?.stripe_subscription_id) {
      try {
        // 期間の終わりまで待たず、いま解約する（退会後に請求が続かないように）
        await stripeRequest("DELETE", `/subscriptions/${sub.stripe_subscription_id}`);
      } catch (e) {
        const err = e as Error & { code?: string; status?: number };
        // すでに解約済み・存在しないなら問題なし
        if (!(err.code === "resource_missing" || err.status === 404)) {
          if (e instanceof StripeNotConfigured) throw new StepError("stripe_not_configured", 503);
          throw new StepError("subscription_cancel_failed", 502, e);
        }
      }
    } else if (
      sub &&
      sub.platform &&
      sub.platform !== "web" &&
      sub.status === "active" &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date())
    ) {
      // App Store / Google Play の購読は、こちらからは解約できない。ストアで止めてもらう
      warnings.push("store_subscription_active");
    }

    // 進行中の交換は取り消す。相手が宙ぶらりんにならないよう、取消の通知は既存のトリガーが送る
    const { error: tradeErr } = await admin
      .from("trade_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: uid,
        cancel_reason: "account_deleted",
      })
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .in("status", ["pending", "accepted"]);
    if (tradeErr) throw new StepError("trade_cancel_failed", 500, tradeErr);

    // 自分が書いた交換メッセージの本文は、記録が相手のために残っても消す
    const { error: tradeMsgErr } = await admin.from("trade_requests").update({ message: null }).eq("sender_id", uid);
    if (tradeMsgErr) throw new StepError("trade_anonymize_failed", 500, tradeMsgErr);

    // (c) Storage
    await removeUserStorage(admin, url, uid);

    // 外部キーで連鎖しない表
    for (const [table, col] of ORPHAN_TABLES) {
      const { error } = await admin.from(table).delete().eq(col, uid);
      if (error) throw new StepError("cleanup_failed", 500, { table, col, error });
    }
    // 承認待ちの提案は本人のもの。承認済みのものは共有のカタログなので残す
    {
      const { error } = await admin.from("tag_candidates").delete().eq("suggested_by", uid).eq("status", "pending");
      if (error) throw new StepError("cleanup_failed", 500, { table: "tag_candidates", error });
    }
    for (const [table, col] of DETACH_COLUMNS) {
      const { error } = await admin.from(table).update({ [col]: null }).eq(col, uid);
      if (error) throw new StepError("cleanup_failed", 500, { table, col, error });
    }

    // (d) アカウント本体。profiles 以下は連鎖して消える
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw new StepError("account_delete_failed", 500, delErr);

    // Stripe の顧客情報（カード等）。請求書など法定保存の記録は Stripe 側に残る
    if (stripeCustomerId) {
      try {
        await stripeRequest("DELETE", `/customers/${stripeCustomerId}`);
      } catch (e) {
        console.error("delete-account: stripe customer delete failed (ignored)", e);
      }
    }

    return json({ success: true, warnings });
  } catch (e) {
    if (e instanceof StepError) return json({ error: e.code }, e.status);
    console.error("delete-account failed:", e);
    return json({ error: "delete_failed" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** バケット内の <prefix>/ 以下を、フォルダの中まで含めて列挙する */
async function listAll(admin: any, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [prefix];
  let guard = 0;
  while (queue.length > 0 && guard++ < 500) {
    const dir = queue.shift()!;
    for (let page = 0; page < MAX_LIST_PAGES; page++) {
      const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 100, offset: page * 100 });
      if (error) throw new StepError("storage_cleanup_failed", 500, { bucket, dir, error });
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const path = `${dir}/${entry.name}`;
        // id が無いものはフォルダ
        if (entry.id === null || entry.id === undefined) queue.push(path);
        else files.push(path);
      }
      if (data.length < 100) break;
    }
  }
  return files;
}

async function removePaths(admin: any, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) throw new StepError("storage_cleanup_failed", 500, { bucket, error });
  }
}

/** 公開URLが、このプロジェクトの Storage を指していれば { bucket, path } に */
function parseOwnStorageUrl(value: unknown, supabaseUrl: string): { bucket: string; path: string } | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const u = new URL(value);
    if (u.origin !== new URL(supabaseUrl).origin) return null;
    const m = u.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const bucket = m[1];
    if (!(BUCKETS as readonly string[]).includes(bucket)) return null;
    return { bucket, path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

/** 自分の行に書かれている画像のURLを集める（Storage 側に <uid>/ の目印が無いものを探すため） */
async function collectOwnUrls(admin: any, uid: string): Promise<string[]> {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v) urls.add(v);
    else if (Array.isArray(v)) v.forEach(add);
  };
  const pull = async (table: string, cols: string[], filter: (q: any) => any) => {
    const { data, error } = await filter(admin.from(table).select(cols.join(","))).limit(MAX_REF_URLS);
    if (error) throw new StepError("storage_cleanup_failed", 500, { table, error });
    for (const row of data ?? []) cols.forEach((c) => add(row[c]));
  };
  const ids = async (table: string, col: string, value: string): Promise<string[]> => {
    const { data, error } = await admin.from(table).select("id").eq(col, value).limit(MAX_REF_URLS);
    if (error) throw new StepError("storage_cleanup_failed", 500, { table, error });
    return (data ?? []).map((r: { id: string }) => r.id);
  };
  const byIds = async (table: string, cols: string[], idCol: string, list: string[]) => {
    for (let i = 0; i < list.length; i += 100) {
      await pull(table, cols, (q) => q.in(idCol, list.slice(i, i + 100)));
    }
  };

  await pull("profiles", ["avatar_url", "cover_image_url"], (q) => q.eq("id", uid));
  await pull("user_items", ["image", "images", "model_3d_url"], (q) => q.eq("user_id", uid));
  await pull("avatar_gallery", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("display_gallery", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("ai_generated_rooms", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("background_presets", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("goods_posts", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("binders", ["cover_image"], (q) => q.eq("user_id", uid));
  await pull("binder_pages", ["background_image", "scene_avatar_url", "bgm_url"], (q) => q.eq("user_id", uid));
  await pull("challenge_entries", ["image_url"], (q) => q.eq("user_id", uid));
  await pull("challenges", ["image_url"], (q) => q.eq("user_id", uid));

  // 投稿の画像・思い出の画像は、自分の投稿・自分のグッズにぶら下がる
  await byIds("item_post_images", ["image_url"], "post_id", await ids("item_posts", "user_id", uid));
  await byIds("item_memories", ["image_url"], "user_item_id", await ids("user_items", "user_id", uid));

  return [...urls];
}

/**
 * ほかの人・公式カタログも同じファイルを指している URL を返す。
 * 公式グッズの画像を自分のグッズにそのまま使っている場合などに、共有の画像を消さないため。
 */
async function findSharedUrls(admin: any, uid: string, urls: string[]): Promise<Set<string>> {
  const shared = new Set<string>();
  const checks: Array<[string, string, boolean]> = [
    ["official_items", "image", false],
    ["content_names", "image_url", false],
    ["original_items", "image", false],
    ["user_items", "image", true], // 他人の user_items
  ];
  for (let i = 0; i < urls.length; i += 50) {
    const chunk = urls.slice(i, i + 50);
    for (const [table, col, excludeSelf] of checks) {
      let q = admin.from(table).select(col).in(col, chunk);
      if (excludeSelf) q = q.neq("user_id", uid);
      const { data, error } = await q;
      if (error) throw new StepError("storage_cleanup_failed", 500, { table, error });
      for (const row of data ?? []) shared.add(row[col]);
    }
  }
  return shared;
}

async function removeUserStorage(admin: any, supabaseUrl: string, uid: string) {
  const perBucket = new Map<string, Set<string>>(BUCKETS.map((b) => [b, new Set<string>()]));

  // 1) <uid>/ 配下（アップロード時に自分のIDで切っているもの）
  for (const bucket of BUCKETS) {
    for (const p of await listAll(admin, bucket, uid)) perBucket.get(bucket)!.add(p);
  }

  // 2) 自分の行が指す、自前の Storage のファイル（<uid>/ の外に置かれているもの）
  const urls = await collectOwnUrls(admin, uid);
  const parsed = urls
    .map((u) => ({ u, ref: parseOwnStorageUrl(u, supabaseUrl) }))
    .filter((x): x is { u: string; ref: { bucket: string; path: string } } => x.ref !== null)
    // <uid>/ 配下は 1) で消える。ここでは外側のものだけ共有チェックにかける
    .filter((x) => !x.ref.path.startsWith(`${uid}/`));
  const shared = await findSharedUrls(admin, uid, parsed.map((x) => x.u));
  for (const { u, ref } of parsed) {
    if (shared.has(u)) continue;
    perBucket.get(ref.bucket)!.add(ref.path);
  }

  for (const [bucket, set] of perBucket) {
    if (set.size > 0) await removePaths(admin, bucket, [...set]);
  }
}
