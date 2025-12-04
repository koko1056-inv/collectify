import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESHY_API_URL = 'https://api.meshy.ai/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
    if (!MESHY_API_KEY) {
      throw new Error('MESHY_API_KEY is not configured');
    }

    const { action, imageUrl, taskId } = await req.json();
    console.log(`Action: ${action}, TaskId: ${taskId || 'N/A'}`);

    // タスクのステータスを確認
    if (action === 'check_status' && taskId) {
      console.log(`Checking status for task: ${taskId}`);
      
      const response = await fetch(`${MESHY_API_URL}/image-to-3d/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${MESHY_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Meshy API error: ${response.status} - ${errorText}`);
        throw new Error(`Meshy API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Task status: ${data.status}`);
      
      return new Response(JSON.stringify({
        status: data.status,
        progress: data.progress,
        modelUrl: data.model_urls?.glb || null,
        thumbnailUrl: data.thumbnail_url || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 新しい3D生成タスクを作成
    if (action === 'create' && imageUrl) {
      console.log(`Creating 3D model from image: ${imageUrl}`);
      
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
        throw new Error(`Meshy API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Task created: ${data.result}`);
      
      return new Response(JSON.stringify({
        taskId: data.result,
        message: '3D model generation started',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action or missing parameters');
  } catch (error) {
    console.error('Error in generate-3d-model function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
