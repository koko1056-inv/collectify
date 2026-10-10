import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  corsHeadersFor,
  jsonResponse,
  rateLimitedResponse,
  readJson,
  requireUser,
} from "../_shared/security.ts";
import { assertPublicHttpsUrl, SsrfError } from "../_shared/ssrf.ts";

const MESHY_API_URL = 'https://api.meshy.ai/openapi/v1';

// 入力の上限
const MAX_DATA_URL_CHARS = 8 * 1024 * 1024; // data URL（base64）の文字数
const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ログイン必須（anon キーだけの呼び出しは 401）
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
    if (!MESHY_API_KEY) {
      console.error('MESHY_API_KEY is not configured');
      return jsonResponse(corsHeaders, { error: '3Dモデル生成は現在利用できません' }, 500);
    }

    const body = await readJson(req);
    if (!body) {
      return jsonResponse(corsHeaders, { error: 'Invalid request body' }, 400);
    }
    const { action, imageUrl, taskId } = body;
    console.log(`Action: ${String(action).slice(0, 20)}, User: ${auth.user.id}`);

    // タスクのステータスを確認
    if (action === 'check_status') {
      if (typeof taskId !== 'string' || !TASK_ID_PATTERN.test(taskId)) {
        return jsonResponse(corsHeaders, { error: 'Invalid taskId' }, 400);
      }

      // 状況確認はポーリングされるので緩め（10分に120回）
      // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限に置き換えること（_shared/security.ts 参照）
      const limit = checkRateLimit(`generate-3d-model:status:${auth.user.id}`, 120, 10 * 60 * 1000);
      if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec);

      console.log(`Checking status for task: ${taskId}`);

      const response = await fetch(`${MESHY_API_URL}/image-to-3d/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${MESHY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Meshy API error: ${response.status} - ${errorText}`);
        return jsonResponse(corsHeaders, { error: '3Dモデルの状況を取得できませんでした' }, 502);
      }

      const data = await response.json();
      console.log(`Task status: ${data.status}`);

      return jsonResponse(corsHeaders, {
        status: data.status,
        progress: data.progress,
        modelUrl: data.model_urls?.glb || null,
        thumbnailUrl: data.thumbnail_url || null,
      });
    }

    // 新しい3D生成タスクを作成
    if (action === 'create') {
      if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
        return jsonResponse(corsHeaders, { error: 'imageUrl is required' }, 400);
      }

      // Meshy に渡すのは https の公開 URL か、小さめの data URL だけ
      if (imageUrl.startsWith('data:')) {
        if (imageUrl.length > MAX_DATA_URL_CHARS || !DATA_IMAGE_PATTERN.test(imageUrl)) {
          return jsonResponse(corsHeaders, { error: 'Invalid image data' }, 400);
        }
      } else {
        try {
          await assertPublicHttpsUrl(imageUrl);
        } catch (e) {
          if (e instanceof SsrfError) return jsonResponse(corsHeaders, { error: e.message }, 400);
          throw e;
        }
      }

      // 生成は高コスト（Meshy の従量課金）なので 1時間に5回まで
      // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限、またはポイント課金に置き換えること
      const limit = checkRateLimit(`generate-3d-model:create:${auth.user.id}`, 5, 60 * 60 * 1000);
      if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec);

      console.log('Creating 3D model task');

      const response = await fetch(`${MESHY_API_URL}/image-to-3d`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MESHY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          enable_pbr: true, // PBRテクスチャを有効化
          ai_model: 'meshy-4', // 最新モデル
          topology: 'triangle', // 三角形メッシュ
          target_polycount: 30000, // ポリゴン数の目標
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Meshy API error: ${response.status} - ${errorText}`);
        return jsonResponse(corsHeaders, { error: '3Dモデルの生成を開始できませんでした' }, 502);
      }

      const data = await response.json();
      console.log(`Task created: ${data.result}`);

      return jsonResponse(corsHeaders, {
        taskId: data.result,
        message: '3D model generation started',
      });
    }

    return jsonResponse(corsHeaders, { error: 'Invalid action or missing parameters' }, 400);
  } catch (error) {
    console.error('Error in generate-3d-model function:', error);
    return jsonResponse(corsHeaders, { error: '3Dモデルの生成に失敗しました' }, 500);
  }
});
