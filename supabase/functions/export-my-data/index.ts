// 自分のデータの書き出し（GDPR 15/20 条・個人情報保護法の開示請求への対応）。
// 呼び出した本人のデータだけを JSON で返す。他のユーザーの非公開情報は含めない:
//   - 交換は、相手の user_id ではなく公開のユーザー名だけを載せる
//   - メッセージは自分が送ったものだけ（受け取った分は相手の発言なので含めない）
//   - 通知は件数だけ
// 1つの表あたり MAX_ROWS 件まで。切り詰めたときは truncated に表名が入る。

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_ROWS = 5000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "login_required" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "login_required" }, 401);
  const user = userRes.user;
  const uid = user.id;

  // 取得は必ず本人の user_id で絞る。service ロールを使うので、絞り忘れ＝他人のデータ漏えいになる点に注意
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const truncated: string[] = [];

  async function rows(table: string, column: string, select = "*", order = "created_at"): Promise<any[]> {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .eq(column, uid)
      .order(order, { ascending: true })
      .limit(MAX_ROWS + 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const list = data ?? [];
    if (list.length > MAX_ROWS) {
      truncated.push(table);
      return list.slice(0, MAX_ROWS);
    }
    return list;
  }

  try {
    const [
      profileRes,
      userItems,
      wishlists,
      itemPosts,
      goodsPosts,
      itemPostComments,
      postComments,
      pointTransactions,
      pointsRes,
      sentMessages,
      follows,
      followers,
      subRes,
      notifCountRes,
      tradeSender,
      tradeReceiver,
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      rows("user_items", "user_id"),
      rows("wishlists", "user_id"),
      rows("item_posts", "user_id"),
      rows("goods_posts", "user_id"),
      rows("item_post_comments", "user_id"),
      rows("post_comments", "user_id"),
      rows("point_transactions", "user_id"),
      admin.from("user_points").select("total_points, login_streak, last_login_date, created_at").eq("user_id", uid).maybeSingle(),
      rows("messages", "sender_id", "id, receiver_id, content, created_at, trade_request_id"),
      rows("follows", "follower_id", "following_id, created_at"),
      rows("follows", "following_id", "follower_id, created_at"),
      admin
        .from("user_subscriptions")
        .select("plan, status, platform, started_at, expires_at, cancel_at_period_end")
        .eq("user_id", uid)
        .maybeSingle(),
      admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid),
      rows("trade_requests", "sender_id"),
      rows("trade_requests", "receiver_id"),
    ]);
    if (profileRes.error) throw new Error(`profiles: ${profileRes.error.message}`);

    // 相手の公開情報（ユーザー名）だけを引く
    const otherIds = new Set<string>();
    for (const t of tradeSender) if (t.receiver_id) otherIds.add(t.receiver_id);
    for (const t of tradeReceiver) if (t.sender_id) otherIds.add(t.sender_id);
    for (const m of sentMessages) if (m.receiver_id) otherIds.add(m.receiver_id);
    for (const f of follows) if (f.following_id) otherIds.add(f.following_id);
    for (const f of followers) if (f.follower_id) otherIds.add(f.follower_id);
    const names = new Map<string, { username: string | null; display_name: string | null }>();
    const idList = [...otherIds];
    for (let i = 0; i < idList.length; i += 200) {
      const { data, error } = await admin.from("profiles").select("id, username, display_name").in("id", idList.slice(i, i + 200));
      if (error) throw new Error(`profiles(other): ${error.message}`);
      for (const p of data ?? []) names.set(p.id, { username: p.username, display_name: p.display_name });
    }
    const who = (id: string | null) => (id ? names.get(id) ?? { username: null, display_name: null } : null);

    const trades = [
      ...tradeSender.map((t) => toTrade(t, "sender", uid, who(t.receiver_id))),
      ...tradeReceiver.map((t) => toTrade(t, "receiver", uid, who(t.sender_id))),
    ].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

    // 自分のデータから、相手側の内部IDを取り除く
    const messages = sentMessages.map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      trade_request_id: m.trade_request_id,
      to: who(m.receiver_id),
    }));

    return json({
      exported_at: new Date().toISOString(),
      format_version: 1,
      account: { id: uid, email: user.email ?? null, created_at: user.created_at },
      profile: profileRes.data ?? null,
      points: { balance: pointsRes.data ?? null, transactions: pointTransactions },
      subscription: subRes.data ?? null,
      user_items: userItems,
      wishlists,
      posts: {
        item_posts: itemPosts,
        goods_posts: goodsPosts,
      },
      comments: {
        item_post_comments: itemPostComments,
        post_comments: postComments,
      },
      trades,
      messages_sent: messages,
      follows: follows.map((f) => ({ user: who(f.following_id), created_at: f.created_at })),
      followers: followers.map((f) => ({ user: who(f.follower_id), created_at: f.created_at })),
      notifications: { count: notifCountRes.count ?? 0 },
      limits: { max_rows_per_table: MAX_ROWS, truncated },
    });
  } catch (e) {
    console.error("export-my-data failed:", e);
    return json({ error: "export_failed" }, 500);
  }
});

/** 交換1件を、相手の内部IDを含まない形にする */
function toTrade(t: any, role: "sender" | "receiver", uid: string, counterparty: unknown) {
  const { sender_id: _s, receiver_id: _r, cancelled_by, ...rest } = t;
  return {
    ...rest,
    role,
    counterparty,
    cancelled_by_me: cancelled_by ? cancelled_by === uid : null,
  };
}
