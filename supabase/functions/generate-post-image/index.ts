import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assertReferenceImageUrl, callAi, currentAiProvider, referenceImageError, SsrfError } from "../_shared/ai.ts";
import { isAdminUser } from "../_shared/security.ts";
import { consumeRateLimit, rateLimitExceededMessageResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// アバターと同じ1枚の画像生成なので、アバターと同じ値段にそろえる
const POINT_COST = 30;

// 参照画像の URL をサーバーから取りに行く（Gemini 直結時）ので、ポイントとは別に回数も絞る。
// 取得に失敗するとポイントは返金されるため、ポイントだけでは連打の歯止めにならない。管理者は対象外。
const USER_LIMITS = { hour: 20, day: 100 };

function referenceImageErrorResponse(e: SsrfError): Response {
  const r = referenceImageError(e);
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
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
    // 返金は1回だけ。内側で返金してから throw すると外側の catch でもう一度呼ばれるため、先に下ろす
    pointsDeducted = false;
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

    // 参照画像の URL は、ポイントを使う前に形を確かめる（内部アドレス・http などは 400）
    if (itemImageUrl) {
      try {
        assertReferenceImageUrl(itemImageUrl);
      } catch (e) {
        if (e instanceof SsrfError) return referenceImageErrorResponse(e);
        throw e;
      }
    }

    if (!(await isAdminUser({ user, userClient }))) {
      const limit = await consumeRateLimit(admin, user.id, 'generate-post-image', USER_LIMITS);
      if (!limit.ok) return rateLimitExceededMessageResponse(corsHeaders, limit);
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

    console.log('generate-post-image provider:', currentAiProvider());

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

    const response = await callAi({ messages, wantImage: true });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status, response.errorText);
      await refund(`AI Gateway ${response.status}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AIクレジットが不足しています。' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const imageUrl = response.imageUrl;
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
    // 参照画像を取りに行けなかった（内部アドレス・画像でない・大きすぎる・取得失敗）
    if (error instanceof SsrfError) return referenceImageErrorResponse(error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
