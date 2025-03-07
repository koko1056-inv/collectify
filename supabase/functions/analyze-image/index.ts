
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    
    // リクエストからデータを取得
    const { imageUrl } = await req.json()
    
    if (!imageUrl) {
      throw new Error('画像URLが提供されていません')
    }

    console.log('画像認識処理を開始:', imageUrl.substring(0, 50) + '...');

    // 画像認識：オブジェクト検出を実行
    const objectDetection = await hf.objectDetection({
      model: 'facebook/detr-resnet-50',
      inputs: imageUrl,
    })
    
    // 画像キャプション生成
    const imageToText = await hf.imageToText({
      model: 'Salesforce/blip-image-captioning-base',
      inputs: imageUrl,
    })

    console.log('認識結果:', { 
      objects: objectDetection.slice(0, 3), 
      caption: imageToText 
    });

    const keywords = [
      ...objectDetection.map(obj => obj.label),
      ...imageToText.generated_text.split(' ')
    ]
    .filter(k => k.length > 3)
    .map(k => k.toLowerCase())
    
    // キーワードと関連するアイテムをSupabaseから検索
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 関連アイテムを検索するクエリ
    const { data: items, error } = await supabase
      .from('official_items')
      .select('*')
      .or(
        keywords.map(keyword => 
          `title.ilike.%${keyword}%,description.ilike.%${keyword}%`
        ).join(',')
      )
      .limit(12)
    
    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        detection: {
          objects: objectDetection,
          caption: imageToText.generated_text
        },
        items: items || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('エラー:', error)
    return new Response(
      JSON.stringify({ 
        error: '予期しないエラーが発生しました', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
