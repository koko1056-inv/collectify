import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { callAi, currentAiProvider } from "../_shared/ai.ts";

// 今日のミッションを「AIで作る」で達成するための1枚を作る。
//
// グッズとお題はクライアントから受け取らず、今日のミッション（claim_mission_ai）から決める
// （無料の生成を、ほかの用途に使えないように）。1日2回まで無料で、回数は DB が数える。失敗したら回数を戻す。
// 作った画像は、その人の推しフォトのフォルダ（kuji_images/<uid>/oshi/）に置いて URL を返す。
// 保存（推しフォトにする）は、見て気に入ったらクライアントが行う。そこでミッション達成になる。

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** お題ごとの場面（ミッションの prompt_id と同じ並び） */
const SCENES: Record<string, string> = {
  sky: "outdoors with a bright, clear blue sky and soft clouds in the background, natural daylight",
  meal: "placed next to a delicious, colorful home-cooked meal on a dining table",
  hand: "held gently in the palm of a hand, showing its size",
  window: "on a windowsill bathed in soft, warm natural window light",
  outing: "on a fun day out, attached to a bag on a sunny city street or park",
  drink: "next to a cute cup of latte or tea on a cozy cafe table",
  flower: "surrounded by fresh flowers and green plants",
  night: "at night with warm bokeh lights and glowing illuminations behind it",
  colormatch: "arranged with small everyday items in exactly the same color palette",
  friends: "in a cheerful group photo, lined up with other cute collectible goods",
  closeup: "in a macro close-up shot that shows its fine details and textures",
  desk: "on a tidy desk with notebooks, pens and stationery",
  book: "with open books and a notebook, cozy reading time",
  shadow: "with dramatic light casting a playful, interesting shadow",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return json({ error: "login_required" }, 401);
  }
  const user = userRes.user;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 今日のミッションを受け取り、回数を1つ使う
  const { data: claim, error: claimErr } = await userClient.rpc("claim_mission_ai");
  if (claimErr) {
    const code = ["mission_ai_limit", "mission_done", "no_mission"].find((c) => claimErr.message?.includes(c));
    return json({ error: code ?? "claim_failed" }, code ? 409 : 500);
  }
  const mission = claim as { item_id: string; title: string; image: string | null; prompt_id: string; tries_left: number };

  const release = async () => {
    try {
      await admin.rpc("release_mission_ai", { _uid: user.id });
    } catch (e) {
      console.error("release failed:", e);
    }
  };

  try {
    const scene = SCENES[mission.prompt_id] ?? SCENES.sky;
    const prompt = [
      `Create a photo-like, charming square (1:1) image of this fan merchandise item ("${mission.title}"), ${scene}.`,
      "Keep the item exactly as it looks in the reference image (same design, colors, characters and printed artwork). Do not change or redraw its artwork.",
      "The item must be the clear main subject. Natural lighting, pleasant colors, social-media-friendly composition.",
      "No text, no watermark, no logos added.",
    ].join("\n");

    console.log("generate-mission-image provider:", currentAiProvider());
    const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      { type: "text", text: prompt },
    ];
    if (mission.image) content.push({ type: "image_url", image_url: { url: mission.image } });

    const response = await callAi({ messages: [{ role: "user", content }], wantImage: true });
    if (!response.ok || !response.imageUrl) {
      console.error("AI error:", response.status, response.errorText);
      await release();
      return json({ error: response.status === 429 ? "rate_limited" : "generation_failed" }, response.status === 429 ? 429 : 502);
    }

    // data URL を推しフォトのフォルダへ置く（推しフォトは自分のフォルダの画像しか保存できない）
    const match = response.imageUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) {
      await release();
      return json({ error: "generation_failed" }, 502);
    }
    const mime = match[1];
    const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    const path = `${user.id}/oshi/ai-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("kuji_images")
      .upload(path, decodeBase64(match[2]), { contentType: mime, cacheControl: "31536000" });
    if (upErr) {
      console.error("upload error:", upErr);
      await release();
      return json({ error: "upload_failed" }, 500);
    }
    const { data: pub } = admin.storage.from("kuji_images").getPublicUrl(path);

    return json({ imageUrl: pub.publicUrl, itemId: mission.item_id, triesLeft: mission.tries_left });
  } catch (error) {
    console.error("generate-mission-image error:", error);
    await release();
    return json({ error: "generation_failed" }, 500);
  }
});
