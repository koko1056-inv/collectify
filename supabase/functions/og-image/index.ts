import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Production URL for the actual app (where humans land after preview).
const APP_URL = "https://collectify.lovable.app";

// Generate an HTML page with OG meta tags for social link previews.
// Usage:
//   /functions/v1/og-image?type=room&id=<roomId>
//   /functions/v1/og-image?type=user&id=<userId>
//   /functions/v1/og-image?type=post&id=<postId>
//   /functions/v1/og-image?type=display&id=<displayId>
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "room";
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let title = "Collectify - 推しグッズコレクション管理";
  let description = "アニメ・ゲーム・アイドルのグッズをコレクション管理。3Dルームで推し部屋を作ってシェアしよう！";
  let imageUrl = `${APP_URL}/og-image.png`;
  let pageUrl = APP_URL;

  try {
    if (type === "room") {
      const { data: room } = await supabase
        .from("binder_pages")
        .select("title, user_id, background_image, visit_count")
        .eq("id", id)
        .maybeSingle();

      if (room) {
        const [{ data: owner }, { count: itemCount }] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", room.user_id)
            .maybeSingle(),
          supabase
            .from("room_furniture")
            .select("*", { count: "exact", head: true })
            .eq("room_id", id),
        ]);

        const ownerName =
          owner?.display_name || owner?.username || "コレクター";
        const count = itemCount ?? 0;
        title = `${ownerName}の推し部屋 ${count > 0 ? `🌟 グッズ${count}個展示中` : ""} | Collectify`;
        description = `${room.title || "マイルーム"} - ${ownerName}さんの推し部屋を覗いてみよう！あなたも推しグッズを飾れる3D空間を無料で作れる #Collectify`;

        if (room.background_image) {
          imageUrl = room.background_image;
        } else if (owner?.avatar_url) {
          imageUrl = owner.avatar_url;
        }
        pageUrl = `${APP_URL}/room/${id}`;
      }
    } else if (type === "user") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, followers_count")
        .eq("id", id)
        .maybeSingle();

      if (profile) {
        const { count: itemCount } = await supabase
          .from("user_items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);

        const name = profile.display_name || profile.username || "コレクター";
        const items = itemCount ?? 0;
        title = `${name}のコレクション ${items > 0 ? `📦 ${items}個` : ""} | Collectify`;
        description =
          profile.bio ||
          `${name}さんのグッズコレクションをチェック！フォロワー${profile.followers_count ?? 0}人 #Collectify #推し活`;
        if (profile.avatar_url) imageUrl = profile.avatar_url;
        pageUrl = `${APP_URL}/user/${id}`;
      }
    } else if (type === "post") {
      const { data: post } = await supabase
        .from("item_posts")
        .select("id, user_id, image_url, caption, like_count")
        .eq("id", id)
        .maybeSingle();

      if (post) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", post.user_id)
          .maybeSingle();
        const ownerName =
          owner?.display_name || owner?.username || "コレクター";
        title = `${ownerName}さんの推しグッズ投稿 ❤️ ${post.like_count ?? 0} | Collectify`;
        description = post.caption
          ? post.caption.slice(0, 120)
          : `${ownerName}さんの投稿をチェック！ #Collectify #推し活`;
        if (post.image_url) imageUrl = post.image_url;
        pageUrl = `${APP_URL}/post/${id}`;
      }
    } else if (type === "display") {
      // display_galleries テーブル想定（存在しない場合は default にフォールバック）
      const { data: display } = await supabase
        .from("display_galleries" as any)
        .select("id, user_id, image_url, title, description")
        .eq("id", id)
        .maybeSingle();

      if (display) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", (display as any).user_id)
          .maybeSingle();
        const ownerName =
          owner?.display_name || owner?.username || "コレクター";
        title = `${ownerName}さんのグッズ展示 ✨ | Collectify`;
        description =
          (display as any).description ||
          (display as any).title ||
          `${ownerName}さんのお気に入りグッズ展示を見てみよう #Collectify`;
        if ((display as any).image_url) imageUrl = (display as any).image_url;
        pageUrl = `${APP_URL}/user/${(display as any).user_id}`;
      }
    }
  } catch (e) {
    console.error("OG fetch error:", e);
  }

  // Escape HTML entities
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // SNSクローラー判定
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isCrawler =
    /bot|crawler|spider|facebookexternalhit|twitterbot|discordbot|slackbot|linebot|whatsapp|telegram|skype|preview/i.test(
      ua,
    );

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:site_name" content="Collectify" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  ${isCrawler ? "" : `<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />`}
</head>
<body>
  <p>Redirecting to <a href="${esc(pageUrl)}">${esc(title)}</a>...</p>
  <script>
    // クローラー以外は即時遷移（refreshメタが効かない環境向けフォールバック）
    if (!/bot|crawler|spider|facebookexternalhit|twitterbot|discordbot|slackbot|linebot|whatsapp|telegram/i.test(navigator.userAgent)) {
      location.replace(${JSON.stringify(pageUrl)});
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
});
