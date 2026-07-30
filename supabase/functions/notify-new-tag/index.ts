import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 新しいタグが作られたことをメールで知らせる。
 *
 * タグは全利用者に共有されるので、勝手な名前や表記揺れが増えていないかを
 * 運営が把握できるようにするのが目的。
 *
 * 必要な設定（Supabase の Edge Function Secrets）:
 *   RESEND_API_KEY  … Resend の API キー
 *   TAG_NOTIFY_TO   … 通知の宛先メールアドレス
 *   TAG_NOTIFY_FROM … 送信元（Resend で認証済みのドメインのアドレス）
 *
 * 未設定でも 200 を返す。通知が飛ばないだけで、
 * タグ登録そのものを失敗させたくないため。
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ログイン済みの利用者からの呼び出しだけ受ける
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization header is required" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { name, category, contentName, source } = await req.json();
    if (typeof name !== "string" || !name.trim()) {
      return json({ error: "name is required" }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("TAG_NOTIFY_TO");
    const from = Deno.env.get("TAG_NOTIFY_FROM");

    if (!apiKey || !to || !from) {
      // 設定漏れは呼び出し側のせいではないので、ログに残して静かに終わる
      console.warn("notify-new-tag: not configured", {
        hasApiKey: !!apiKey,
        hasTo: !!to,
        hasFrom: !!from,
      });
      return json({ sent: false, reason: "not_configured" });
    }

    // 誰が作ったかを添える（誰の操作で増えたか追えるように）
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const categoryLabel =
      category === "character"
        ? "キャラクター"
        : category === "series"
          ? "シリーズ"
          : category === "type"
            ? "グッズタイプ"
            : (category || "未分類");

    const rows: [string, string][] = [
      ["タグ名", name],
      ["種類", categoryLabel],
      ["作品", contentName || "（紐付けなし）"],
      ["作成者", profile?.display_name || profile?.username || user.id],
      ["作成元", source || "不明"],
    ];

    const html = `
      <p>Collectify に新しいタグが追加されました。</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><th align="left" style="background:#f5f5f5">${esc(k)}</th><td>${esc(String(v))}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="color:#888;font-size:12px">
        名前が正しくない場合は、管理画面のタグ管理から修正してください。
      </p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Collectify] 新しいタグ「${name}」が追加されました`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("notify-new-tag: resend failed", res.status, detail);
      return json({ sent: false, reason: "send_failed" });
    }

    return json({ sent: true });
  } catch (error) {
    console.error("notify-new-tag: unexpected error", error);
    // 通知の失敗でタグ登録を失敗扱いにしないため、200 で返す
    return json({ sent: false, reason: "error" });
  }
});
