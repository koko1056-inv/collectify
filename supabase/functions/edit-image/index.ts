import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EDIT_IMAGE_COST = 10;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
        _points: EDIT_IMAGE_COST,
        _transaction_type: "post_image_generation_refund",
        _description: `投稿用画像生成失敗 返金: ${reason}`,
      });
    } catch (e) {
      console.error("refund failed:", e);
    }
  };

  try {
    const { imageUrl, prompt, avatarUrl, itemImages } = await req.json();

    if (!imageUrl || !prompt) {
      return jsonResp({ error: 'imageUrl and prompt are required' }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // 残高チェック → 消費
    const { data: pointRow } = await adminClient
      .from("user_points")
      .select("total_points")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = pointRow?.total_points ?? 0;
    if (balance < EDIT_IMAGE_COST) {
      return jsonResp(
        {
          error: `ポイントが不足しています（必要: ${EDIT_IMAGE_COST}pt / 現在: ${balance}pt）`,
          code: "INSUFFICIENT_POINTS",
        },
        402
      );
    }

    await adminClient.rpc("add_user_points", {
      _user_id: user.id,
      _points: -EDIT_IMAGE_COST,
      _transaction_type: "post_image_generation",
      _description: "投稿用画像生成",
    });
    pointsDeducted = true;

    console.log('Editing image with prompt:', prompt);

    // コンテンツ配列を構築
    const content: any[] = [];

    if (avatarUrl) {
      content.push({
        type: "text",
        text: `【画像生成タスク】\n\n${prompt}\n\n【画像の役割】\n- 1枚目：アバター画像 - このキャラクターの全ての特徴（顔、髪型、表情、服装、色調、画風）を完全に維持\n- 2枚目：グッズ画像 - このグッズを参考にして生成\n\n【厳守事項】\n✓ アバター（1枚目）の人物の外見・スタイルは一切変更しない\n✓ アバターの画風、色調を維持\n✓ グッズの色、デザイン、形状を忠実に再現\n✓ 自然で違和感のない画像を生成`
      });
      content.push({ type: "image_url", image_url: { url: avatarUrl, detail: "high" } });
      content.push({ type: "image_url", image_url: { url: imageUrl, detail: "high" } });
    } else {
      content.push({
        type: "text",
        text: `【画像生成タスク】\n\n${prompt}\n\n以下の画像を参考にして新しい画像を生成してください。\n\n【厳守事項】\n✓ 元の画像の特徴やスタイルを参考にする\n✓ ユーザーの指示に従って画像を生成`
      });
      content.push({ type: "image_url", image_url: { url: imageUrl, detail: "high" } });
    }

    if (itemImages && Array.isArray(itemImages) && itemImages.length > 0) {
      const imagesToAdd = itemImages.slice(0, 3);
      for (const itemImageUrl of imagesToAdd) {
        content.push({ type: "image_url", image_url: { url: itemImageUrl } });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        await refund("rate_limited");
        return jsonResp({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }, 429);
      }
      if (response.status === 402) {
        await refund("ai_credit_exhausted");
        return jsonResp({ error: '使用クレジットが不足しています。ワークスペースに追加してください。' }, 402);
      }

      await refund(`api_error_${response.status}`);
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      await refund("no_image_returned");
      throw new Error('編集された画像が取得できませんでした');
    }

    console.log('Image edited successfully');

    return jsonResp({ editedImageUrl });
  } catch (error) {
    console.error('Error in edit-image function:', error);
    await refund("exception");
    return jsonResp(
      { error: error instanceof Error ? error.message : '画像の編集に失敗しました' },
      500
    );
  }
});
