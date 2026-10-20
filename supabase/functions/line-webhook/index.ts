import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LINE Messaging API の Webhook。friend_added（友だち追加/解除）だけを扱う。
 *
 * 【安全のための決まり】
 *   - X-Line-Signature を LINE_CHANNEL_SECRET で HMAC-SHA256 検証してから処理する
 *     （LINE Developers コンソールの Webhook 設定にはこの関数を --no-verify-jwt でデプロイして登録する。
 *     SupabaseのJWTではなくこの署名で本人確認するため）。
 *   - LINE_CHANNEL_SECRET が未設定なら 503（検証できないので安全側に倒して処理しない）。
 *   - 署名が合わなければ 401。
 *   - follow イベント: line_user_links.friend_added を true にする（行が無ければ何もしない。
 *     Collectifyアカウントとの紐付けは LiffAutoLink か LINEログイン時の自動紐付けで作られる）。
 *   - unfollow イベント: friend_added を false にする。
 *   - その他のイベント（メッセージなど）は何もせず200を返す（応答メッセージは使わない）。
 */

async function verifySignature(secret: string, body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

interface LineWebhookEvent {
  type: string;
  source?: { type?: string; userId?: string };
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (!channelSecret) {
    console.warn("line-webhook: LINE_CHANNEL_SECRET is not configured");
    return new Response("Service Unavailable", { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!(await verifySignature(channelSecret, rawBody, signature))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { events?: LineWebhookEvent[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  for (const event of payload.events ?? []) {
    const lineUserId = event.source?.userId;
    if (!lineUserId || event.source?.type !== "user") continue;

    if (event.type === "follow") {
      const { error } = await admin
        .from("line_user_links")
        .update({ friend_added: true })
        .eq("line_user_id", lineUserId);
      if (error) console.error("line-webhook: follow update failed", error.message);
    } else if (event.type === "unfollow") {
      const { error } = await admin
        .from("line_user_links")
        .update({ friend_added: false })
        .eq("line_user_id", lineUserId);
      if (error) console.error("line-webhook: unfollow update failed", error.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
