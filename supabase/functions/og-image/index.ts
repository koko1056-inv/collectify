import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate an HTML page with OG meta tags for social link previews.
// Usage: /functions/v1/og-image?type=room&id=<roomId>
//        /functions/v1/og-image?type=user&id=<userId>
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

  let title = "Collectify";
  let description = "推しグッズコレクション管理アプリ";
  let imageUrl = `${supabaseUrl}/storage/v1/object/public/assets/og-default.png`;
  let pageUrl = supabaseUrl.replace(".supabase.co", ".vercel.app");

  try {
    if (type === "room") {
      const { data: room } = await supabase
        .from("binder_pages")
        .select("title, user_id, background_image")
        .eq("id", id)
        .single();

      if (room) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", room.user_id)
          .single();

        const ownerName =
          owner?.display_name || owner?.username || "コレクター";
        title = `${room.title || "マイルーム"} - ${ownerName}のルーム`;
        description = `${ownerName}の推し部屋を覗いてみよう！ #Collectify`;

        if (room.background_image) {
          imageUrl = room.background_image;
        } else if (owner?.avatar_url) {
          imageUrl = owner.avatar_url;
        }
        pageUrl += `/room/${id}`;
      }
    } else if (type === "user") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", id)
        .single();

      if (profile) {
        const name = profile.display_name || profile.username || "コレクター";
        title = `${name}のコレクション - Collectify`;
        description =
          profile.bio || `${name}のグッズコレクションをチェック！ #Collectify`;
        if (profile.avatar_url) imageUrl = profile.avatar_url;
        pageUrl += `/user/${id}`;
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
  <meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${esc(pageUrl)}">${esc(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
