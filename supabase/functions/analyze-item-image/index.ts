import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('画像URLが必要です');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing image:', imageUrl);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `この画像はアニメグッズやキャラクターグッズの商品画像です。画像を分析して以下の情報を推測してください：

1. 商品タイトル（具体的な商品名）
2. 商品説明（簡潔な説明）
3. 推定価格（日本円で、一般的な相場から推測）
4. カテゴリ（例：フィギュア、ぬいぐるみ、アクリルスタンド、缶バッジ、キーホルダー、タペストリー、クリアファイル、Tシャツ、その他）
5. 作品名・コンテンツ名（もし分かれば）
6. キャラクター名（もし分かれば）

JSON形式で以下のように回答してください：
{
  "title": "商品タイトル",
  "description": "商品説明",
  "price": "価格（数字のみ）",
  "category": "カテゴリ",
  "contentName": "作品名",
  "characterName": "キャラクター名"
}

不明な項目は空文字列 "" にしてください。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: '利用可能なクレジットがありません。ワークスペースにクレジットを追加してください。' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AIからの応答が空です');
    }

    const analysisResult = JSON.parse(content);
    console.log('Analysis result:', analysisResult);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-item-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '画像の分析中にエラーが発生しました' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
