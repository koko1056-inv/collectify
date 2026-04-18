import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POINT_COST = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

  // 認証ユーザー特定
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: 'ログインが必要です' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const user = userRes.user;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let pointsDeducted = false;
  const refund = async (reason: string) => {
    if (!pointsDeducted) return;
    try {
      await admin.rpc('add_user_points', {
        _user_id: user.id,
        _points: POINT_COST,
        _transaction_type: 'ai_post_image_refund',
        _description: `AI投稿画像生成 失敗返金: ${reason}`,
      });
    } catch (e) {
      console.error('refund failed:', e);
    }
  };

  try {
    const { prompt, itemTitle, itemImageUrl } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // ポイント残高チェック
    const { data: pointRow } = await admin
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .maybeSingle();
    const balance = pointRow?.total_points ?? 0;
    if (balance < POINT_COST) {
      return new Response(
        JSON.stringify({ error: `ポイントが不足しています（必要: ${POINT_COST}pt / 現在: ${balance}pt）` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ポイント消費
    const { error: deductErr } = await admin.rpc('add_user_points', {
      _user_id: user.id,
      _points: -POINT_COST,
      _transaction_type: 'ai_post_image_generation',
      _description: 'AI投稿画像生成',
    });
    if (deductErr) {
      console.error('point deduct error:', deductErr);
      throw new Error('ポイント消費に失敗しました');
    }
    pointsDeducted = true;

    const fullPrompt = `グッズ「${itemTitle ?? ''}」の魅力的な投稿用画像を生成してください。\n\nユーザーの希望: ${prompt}\n\n【要件】\n- SNS投稿に映える高品質な仕上がり\n- 1:1の正方形アスペクト比\n- グッズが主役になる構図\n- 自然な光と魅力的な配色`;

    const messages: any[] = [];
    if (itemImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          { type: "image_url", image_url: { url: itemImageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: fullPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      await refund(`AI Gateway ${response.status}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AIクレジットが不足しています。' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      await refund('画像生成失敗');
      throw new Error('画像が生成されませんでした');
    }

    return new Response(
      JSON.stringify({ imageUrl, pointsUsed: POINT_COST }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-post-image error:', error);
    await refund((error as Error).message || 'unknown');
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
