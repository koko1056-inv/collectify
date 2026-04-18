import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateAiRoomInput {
  itemImageUrls: string[]; // 最大3枚
  itemIds?: string[]; // 任意: 選択した user_items の ID 一覧
  stylePrompt: string; // 部屋スタイルのプロンプト
  stylePreset?: string; // 任意: "pastel_kawaii" など
  visualStyle?: string; // 任意: "anime" / "realistic" など
  visualStylePrompt?: string; // 任意: 描画スタイルの追加指示
  customPrompt?: string; // 任意: ユーザーのフリーテキスト
  title?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 認証
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as GenerateAiRoomInput;
    const {
      itemImageUrls,
      itemIds,
      stylePrompt,
      stylePreset,
      visualStyle,
      visualStylePrompt,
      customPrompt,
      title,
    } = body;

    if (!itemImageUrls || itemImageUrls.length === 0) {
      return json({ error: "アイテム画像が必要です" }, 400);
    }
    if (itemImageUrls.length > 3) {
      return json({ error: "アイテムは最大3つまでです" }, 400);
    }
    if (!stylePrompt) {
      return json({ error: "スタイルが必要です" }, 400);
    }

    // 最終プロンプト構築: グッズを "自然に配置された" 状態で描画するよう指示
    const itemCount = itemImageUrls.length;
    const fullPrompt = `あなたは推し活コレクターの部屋を描くアーティストです。

【部屋スタイル】
${stylePrompt}

${visualStylePrompt ? `【描画スタイル】\n${visualStylePrompt}\n` : ""}
【配置するアイテム】
${itemCount}つの画像で示されたグッズを、この部屋の中に自然な形で配置してください。棚の上、壁、ディスプレイケース、台座など、アイテムの種類に応じて最も映える場所に置きます。

【重要な要件】
- 参考画像のグッズ(キャラクター、ロゴ、デザイン)を**忠実に再現**して配置する
- 高品質で立体感のある仕上がり
- 16:9の横長アスペクト比
- コレクターが見て"これは自分の部屋だ"と感じられる、愛着が湧くシーン
- 柔らかい光、適度な影、立体感
- 1枚の画像として完成させる
- 上記の【描画スタイル】を厳格に守ること

${customPrompt ? `\n【追加の要望】\n${customPrompt}` : ""}`;

    // Gemini 2.5 Flash Image に参照画像付きで生成を依頼
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text", text: fullPrompt },
          ...itemImageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ];

    console.log("Generating AI room with", itemCount, "items. Style:", stylePreset, "Visual:", visualStyle);

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages,
          modalities: ["image", "text"],
        }),
      }
    );

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("AI Gateway error:", aiRes.status, errorText);
      if (aiRes.status === 429) {
        return json({ error: "レート制限に達しました。しばらく待って再試行してください" }, 429);
      }
      if (aiRes.status === 402) {
        return json({ error: "使用クレジットが不足しています" }, 402);
      }
      return json({ error: "画像生成に失敗しました" }, 500);
    }

    const aiData = await aiRes.json();
    const imageDataUrl =
      aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      console.error("No image in response:", JSON.stringify(aiData).slice(0, 500));
      return json({ error: "画像が生成できませんでした" }, 500);
    }

    // data:image/png;base64,xxx → Buffer に変換して storage にアップロード
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    let finalImageUrl = imageDataUrl;

    if (match) {
      const mimeType = match[1];
      const b64 = match[2];
      const ext = mimeType.split("/")[1] || "png";
      const filename = `${user.id}/${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

      const { error: upErr } = await adminClient.storage
        .from("ai-rooms")
        .upload(filename, bytes, { contentType: mimeType, upsert: false });

      if (upErr) {
        console.error("Upload error:", upErr);
      } else {
        const { data: publicData } = adminClient.storage
          .from("ai-rooms")
          .getPublicUrl(filename);
        finalImageUrl = publicData.publicUrl;
      }
    }

    // DB にレコード保存
    const { data: room, error: insertError } = await adminClient
      .from("ai_generated_rooms")
      .insert({
        user_id: user.id,
        image_url: finalImageUrl,
        style_preset: stylePreset || null,
        style_prompt: stylePrompt,
        custom_prompt: customPrompt || null,
        source_item_images: itemImageUrls,
        source_item_ids: itemIds && itemIds.length > 0 ? itemIds : null,
        title: title || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return json({ error: "保存に失敗しました", imageUrl: finalImageUrl }, 500);
    }

    // 投稿(goods_posts)にも反映: 最初の選択アイテムを紐付ける
    if (itemIds && itemIds.length > 0) {
      const captionParts: string[] = [];
      if (title) captionParts.push(title);
      captionParts.push("AIで作った推しルーム ✨");
      if (customPrompt) captionParts.push(customPrompt);
      const caption = captionParts.join("\n");

      const { error: postErr } = await adminClient.from("goods_posts").insert({
        user_id: user.id,
        user_item_id: itemIds[0],
        image_url: finalImageUrl,
        caption,
      });
      if (postErr) {
        console.error("goods_posts insert error:", postErr);
        // 投稿失敗でもルーム生成は成功扱い
      }
    }

    return json({ room, imageUrl: finalImageUrl });
  } catch (error) {
    console.error("Error in generate-ai-room:", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "AI生成に失敗しました",
      },
      500
    );
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
