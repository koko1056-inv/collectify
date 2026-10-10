import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callAi, currentAiProvider } from "../_shared/ai.ts";
import {
  checkRateLimit,
  corsHeadersFor,
  jsonResponse,
  rateLimitedResponse,
  readJson,
  requireUser,
} from "../_shared/security.ts";

// プロンプトの上限（プリセットは100字前後）
const MAX_PROMPT_CHARS = 1000;

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

    // AI 画像生成は高コストなので 1時間に20回まで
    // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限、またはポイント課金に置き換えること（_shared/security.ts 参照）
    const limit = checkRateLimit(`generate-background:${auth.user.id}`, 20, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec);

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
