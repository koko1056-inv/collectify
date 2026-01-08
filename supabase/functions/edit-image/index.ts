import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt, avatarUrl, itemImages } = await req.json();
    
    if (!imageUrl || !prompt) {
      throw new Error('imageUrl and prompt are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Editing image with prompt:', prompt);
    console.log('Image URL (goods) provided:', !!imageUrl);
    console.log('Avatar URL provided:', !!avatarUrl);
    console.log('Item images count:', itemImages?.length || 0);

    // コンテンツ配列を構築
    const content: any[] = [];

    // アバターが選択されている場合のプロンプト
    if (avatarUrl) {
      content.push({
        type: "text",
        text: `【画像生成タスク】\n\n${prompt}\n\n【画像の役割】\n- 1枚目：アバター画像 - このキャラクターの全ての特徴（顔、髪型、表情、服装、色調、画風）を完全に維持\n- 2枚目：グッズ画像 - このグッズを参考にして生成\n\n【厳守事項】\n✓ アバター（1枚目）の人物の外見・スタイルは一切変更しない\n✓ アバターの画風、色調を維持\n✓ グッズの色、デザイン、形状を忠実に再現\n✓ 自然で違和感のない画像を生成`
      });
      // アバター画像を最初に追加
      content.push({
        type: "image_url",
        image_url: {
          url: avatarUrl,
          detail: "high"
        }
      });
      // グッズ画像を追加
      content.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "high"
        }
      });
    } else {
      // アバターなしの場合はグッズ画像のみ
      content.push({
        type: "text",
        text: `【画像生成タスク】\n\n${prompt}\n\n以下の画像を参考にして新しい画像を生成してください。\n\n【厳守事項】\n✓ 元の画像の特徴やスタイルを参考にする\n✓ ユーザーの指示に従って画像を生成`
      });
      content.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "high"
        }
      });
    }

    // 追加のグッズ画像を追加（最大3枚まで）
    if (itemImages && Array.isArray(itemImages) && itemImages.length > 0) {
      const imagesToAdd = itemImages.slice(0, 3);
      for (const itemImageUrl of imagesToAdd) {
        content.push({
          type: "image_url",
          image_url: {
            url: itemImageUrl
          }
        });
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
        messages: [
          {
            role: "user",
            content
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
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

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error('編集された画像が取得できませんでした');
    }

    console.log('Image edited successfully');

    return new Response(
      JSON.stringify({ editedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in edit-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '画像の編集に失敗しました' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
