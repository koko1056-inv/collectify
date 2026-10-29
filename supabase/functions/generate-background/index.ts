import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAi, currentAiProvider } from "../_shared/ai.ts";
import {
  corsHeadersFor,
  isAdminUser,
  jsonResponse,
  readJson,
  requireUser,
} from "../_shared/security.ts";
import { consumeRateLimit, rateLimitExceededMessageResponse } from "../_shared/rate-limit.ts";

// プロンプトの上限（プリセットは100字前後）
const MAX_PROMPT_CHARS = 1000;

// 無料の AI 画像生成なので、DB で数えて1日10回まで（全インスタンス共通）。管理者は対象外。
const USER_LIMITS = { hour: 10, day: 10 };

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ログイン必須（anon キーだけの呼び出しは 401）
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body = await readJson(req);
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return jsonResponse(corsHeaders, { error: 'prompt is required' }, 400);
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonResponse(corsHeaders, { error: 'prompt is too long' }, 400);
    }

    if (!(await isAdminUser(auth))) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const limit = await consumeRateLimit(supabaseAdmin, auth.user.id, 'generate-background', USER_LIMITS);
      if (!limit.ok) return rateLimitExceededMessageResponse(corsHeaders, limit);
    }

    console.log('Generating background image, promptLength:', prompt.length, 'provider:', currentAiProvider());

    const response = await callAi({
      messages: [
        {
          role: "user",
          content: `グッズ展示場の背景画像を生成してください。以下の要件を満たす高品質な画像を作成してください：\n\n${prompt}\n\n【重要な要件】\n- 16:9の横長アスペクト比\n- グッズを配置できる十分なスペースがある\n- 照明が適切で、グッズが映える環境\n- 清潔で整理された印象\n- 実写風の高品質な仕上がり`
        }
      ],
      wantImage: true,
    });

    if (!response.ok) {
      console.error('AI error:', response.status, response.errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }), 
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: '使用クレジットが不足しています。ワークスペースに追加してください。' }), 
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`API error: ${response.statusText}`);
    }

    const imageUrl = response.imageUrl;

    if (!imageUrl) {
      throw new Error('画像が生成できませんでした');
    }

    console.log('Background image generated successfully');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-background function:', error);
    // 内部のエラー文言（API の応答など）はクライアントに返さない
    return jsonResponse(corsHeaders, { error: '背景画像の生成に失敗しました' }, 500);
  }
});
