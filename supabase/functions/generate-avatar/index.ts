import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVATAR_GENERATION_COST = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 認証
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResp({ error: "ログインが必要です" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return jsonResp({ error: "ログインが必要です" }, 401);
  }
  const user = userRes.user;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let pointsDeducted = false;
  const refund = async (reason: string) => {
    if (!pointsDeducted) return;
    try {
      await adminClient.rpc("add_user_points", {
        _user_id: user.id,
        _points: AVATAR_GENERATION_COST,
        _transaction_type: "avatar_generation_refund",
        _description: `アバター生成失敗 返金: ${reason}`,
      });
    } catch (e) {
      console.error("refund failed:", e);
    }
  };

  try {
    const { prompt, imageUrl } = await req.json();

    if (!prompt && !imageUrl) {
      return jsonResp({ error: "プロンプトまたは画像が必要です" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // 初回判定: 過去のアバター生成履歴 もしくは avatar_gallery にレコードがあるか
    const { count: pastTxCount } = await adminClient
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("transaction_type", ["avatar_generation", "avatar_generation_free"]);

    const { count: pastAvatarCount } = await adminClient
      .from("avatar_gallery")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const isFirstTime = (pastTxCount ?? 0) === 0 && (pastAvatarCount ?? 0) === 0;

    if (isFirstTime) {
      // 初回無料: 履歴のみ記録
      await adminClient.rpc("add_user_points", {
        _user_id: user.id,
        _points: 0,
        _transaction_type: "avatar_generation_free",
        _description: "AIアバター生成（初回無料）",
      });
    } else {
      // 通常のポイント消費
      const { data: pointRow } = await adminClient
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      const balance = pointRow?.total_points ?? 0;
      if (balance < AVATAR_GENERATION_COST) {
        return jsonResp(
          {
            error: `ポイントが不足しています（必要: ${AVATAR_GENERATION_COST}pt / 現在: ${balance}pt）`,
            code: "INSUFFICIENT_POINTS",
          },
          402
        );
      }
      const { error: deductErr } = await adminClient.rpc("add_user_points", {
        _user_id: user.id,
        _points: -AVATAR_GENERATION_COST,
        _transaction_type: "avatar_generation",
        _description: "AIアバター生成",
      });
      if (deductErr) {
        console.error("point deduct error:", deductErr);
        throw new Error("ポイント消費に失敗しました");
      }
      pointsDeducted = true;
    }

    // 3D風のアバター生成用のプロンプトを構築
    let enhancedPrompt = prompt;
    if (imageUrl) {
      enhancedPrompt = `${prompt || "Transform this photo into a 3D animated character"}. 
      Create a high-quality 3D render with smooth textures, professional lighting, 
      centered composition, neutral background, suitable for a profile picture. 
      Style: Modern 3D character design, Pixar/Disney quality rendering.`;
    } else {
      enhancedPrompt = `Create a 3D-style avatar portrait with the following characteristics: ${prompt}. 
      The avatar should be a high-quality 3D render with smooth textures, professional lighting, 
      centered composition, neutral background, suitable for a profile picture. 
      Style: Modern 3D character design, Pixar/Disney quality rendering.`;
    }

    console.log("Generating avatar. firstTime:", isFirstTime);

    const messageContent: any[] = [
      { type: "text", text: enhancedPrompt },
    ];
    if (imageUrl) {
      messageContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      await refund(`AI Gateway ${response.status}`);
      if (response.status === 429) {
        return jsonResp({ error: "レート制限に達しました。しばらくしてから再度お試しください。" }, 429);
      }
      if (response.status === 402) {
        return jsonResp({ error: "クレジットが不足しています。ワークスペースに資金を追加してください。" }, 402);
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      await refund("画像生成失敗");
      throw new Error("画像の生成に失敗しました");
    }

    return jsonResp({
      imageUrl: generatedImageUrl,
      pointsUsed: isFirstTime ? 0 : AVATAR_GENERATION_COST,
      freeTrial: isFirstTime,
    });
  } catch (error) {
    console.error("Error in generate-avatar:", error);
    await refund((error as Error).message || "unknown");
    return jsonResp(
      { error: error instanceof Error ? error.message : "アバター生成に失敗しました" },
      500
    );
  }
});

function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
