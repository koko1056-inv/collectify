import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LINE公式アカウントの友だちに、Messaging API で push 通知を送る。
 *
 * 送るもの（呼び出し元の "kind" で切り替え）:
 *   - "digest": 推しの新商品（notifications.type='oshi_new_items'）と、交換の返事
 *     （承認・お断り・発送・受取・完了・催促）。候補は public.line_push_digest_candidates() が、
 *     カテゴリ別ON/OFF・静音時間（22-8時JST既定）・1日3通の上限・サンプルアカウント除外・
 *     「LINE通知」トグルをすべて判定した上で返す。
 *   - "daily_reminder": デイリーログインをまだ受け取っていない連携ユーザーへの催促。
 *     候補は public.line_push_daily_reminder_candidates() が同じ条件で返す。
 *
 * 【安全のための決まり】
 *   - 呼べるのは cron（x-cron-secret。catalog-thumbs と同じ合言葉の仕組み）か管理者だけ。
 *   - LINE_CHANNEL_ACCESS_TOKEN（Supabase の Edge Function Secrets）が未設定なら、
 *     何も送らずログだけ残して 200 を返す（通知が飛ばないだけで、呼び出し自体を失敗させない）。
 *   - 送信に成功したら必ず line_push_log に記録してから次へ進む（二重送信防止・上限の計算に使われる）。
 *   - LINEの応答が 403（ブロック・未フォロー）のときは、その連携の friend_added を false にする。
 *
 * 【呼び出し】
 *   POST /functions/v1/line-push   { "kind": "digest" | "daily_reminder", "limit": 50 }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_URL = "https://collectify.jp";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

async function isAuthorized(req: Request, admin: AdminClient): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (secret) {
    const { data, error } = await admin.rpc("line_push_secret_ok", { p_secret: secret });
    return !error && data === true;
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return false;
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return isAdmin === true;
}

interface DigestCandidate {
  push_id: string;
  kind: "oshi_new_items" | "trade_reply";
  user_id: string;
  line_user_id: string;
  title: string;
  message: string | null;
  url: string;
}

interface DailyReminderCandidate {
  user_id: string;
  line_user_id: string;
  cycle_day: number;
}

function digestText(c: DigestCandidate): string {
  const path = c.url && c.url.startsWith("/") ? c.url : "/";
  const lines = [c.title];
  if (c.message) lines.push(c.message);
  lines.push(`${SITE_URL}${path}`);
  return lines.join("\n");
}

function dailyReminderText(c: DailyReminderCandidate): string {
  return [
    `今日のごほうびが待ってるよ（Day ${c.cycle_day}）`,
    "ログインすると、ポイントや着せ替えがもらえるよ。",
    `${SITE_URL}/`,
  ].join("\n");
}

/** LINE Messaging API へ1件送る。戻り値は { ok, blocked }（blocked=true は403=ブロック/未フォロー）。 */
async function sendLinePush(token: string, lineUserId: string, text: string): Promise<{ ok: boolean; blocked: boolean }> {
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: text.slice(0, 4900) }],
    }),
  });
  if (res.status === 403) {
    return { ok: false, blocked: true };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("line-push: LINE API error", res.status, detail);
    return { ok: false, blocked: false };
  }
  return { ok: true, blocked: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (!(await isAuthorized(req, admin))) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const kind = body.kind === "daily_reminder" ? "daily_reminder" : "digest";
    const limit = Math.min(Math.max(Number(body.limit ?? 50) || 50, 1), 200);

    const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (!token) {
      // 未設定は呼び出し側のせいではないので、ログに残して静かに終わる。
      console.warn("line-push: LINE_CHANNEL_ACCESS_TOKEN is not configured");
      return json({ sent: 0, reason: "not_configured" });
    }

    let sent = 0;
    let blockedCount = 0;
    let failed = 0;

    if (kind === "digest") {
      const { data: candidates, error } = await admin.rpc("line_push_digest_candidates", { _limit: limit });
      if (error) {
        console.error("line-push: line_push_digest_candidates failed", error.message);
        return json({ error: "candidates query failed" }, 500);
      }
      for (const c of (candidates ?? []) as DigestCandidate[]) {
        const result = await sendLinePush(token, c.line_user_id, digestText(c));
        if (result.ok) {
          sent++;
          await admin.from("line_push_log").insert({
            kind: c.kind,
            dedupe_key: c.push_id,
            user_id: c.user_id,
            line_user_id: c.line_user_id,
            notification_id: c.push_id,
          });
          await admin.from("line_user_links").update({ last_push_at: new Date().toISOString() }).eq("line_user_id", c.line_user_id);
        } else if (result.blocked) {
          blockedCount++;
          await admin.from("line_user_links").update({ friend_added: false }).eq("line_user_id", c.line_user_id);
        } else {
          failed++;
        }
      }
    } else {
      const { data: candidates, error } = await admin.rpc("line_push_daily_reminder_candidates", { _limit: limit });
      if (error) {
        console.error("line-push: line_push_daily_reminder_candidates failed", error.message);
        return json({ error: "candidates query failed" }, 500);
      }
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
      for (const c of (candidates ?? []) as DailyReminderCandidate[]) {
        const result = await sendLinePush(token, c.line_user_id, dailyReminderText(c));
        if (result.ok) {
          sent++;
          await admin.from("line_push_log").insert({
            kind: "daily_reminder",
            dedupe_key: `${c.user_id}:${today}`,
            user_id: c.user_id,
            line_user_id: c.line_user_id,
          });
          await admin.from("line_user_links").update({ last_push_at: new Date().toISOString() }).eq("line_user_id", c.line_user_id);
        } else if (result.blocked) {
          blockedCount++;
          await admin.from("line_user_links").update({ friend_added: false }).eq("line_user_id", c.line_user_id);
        } else {
          failed++;
        }
      }
    }

    return json({ sent, blocked: blockedCount, failed });
  } catch (error) {
    console.error("line-push: unexpected error", error);
    return json({ error: "unexpected error" }, 500);
  }
});
