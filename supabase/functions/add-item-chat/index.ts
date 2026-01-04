import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `あなたはグッズ登録をサポートするアシスタントです。ユーザーと対話しながら、以下の情報を収集してください：

1. 画像（URL または添付）- 最初に受け取る
2. タイトル - グッズの名前
3. コンテンツ名 - 作品名（アニメ、ゲーム等）
4. キャラクター - キャラクター名
5. グッズタイプ - アクリルスタンド、缶バッジ、ぬいぐるみ等
6. シリーズ - シリーズ名（任意）
7. 価格 - 円単位

対話のルール：
- フレンドリーで親しみやすいトーンで
- 一度に1つの質問だけをする
- 画像から推測できる情報があれば候補として提示
- ユーザーが「スキップ」と言ったら次の質問へ
- 全ての必須情報が揃ったら確認を求める

必ず以下のJSON形式で返答してください：
{
  "message": "ユーザーへのメッセージ",
  "suggestions": ["候補1", "候補2"],
  "currentField": "収集中のフィールド名",
  "collectedData": {
    "imageUrl": "画像URL",
    "title": "タイトル",
    "content_name": "コンテンツ名",
    "characterTag": "キャラクター",
    "typeTag": "グッズタイプ",
    "seriesTag": "シリーズ",
    "price": "価格"
  },
  "isComplete": false,
  "isConfirmed": false
}

isComplete: 全ての必須情報（画像、タイトル、コンテンツ名、タイプ）が揃ったらtrue
isConfirmed: ユーザーが最終確認でOKしたらtrue`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build messages array with image if provided
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => {
        if (msg.imageUrl) {
          return {
            role: msg.role,
            content: [
              { type: "text", text: msg.content || "この画像のグッズを登録したいです" },
              { type: "image_url", image_url: { url: msg.imageUrl } }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "レート制限に達しました。少し待ってからお試しください。" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "クレジットが不足しています。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Try to parse JSON from the response
    let parsed;
    try {
      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return as plain message
      parsed = {
        message: content,
        suggestions: [],
        currentField: null,
        collectedData: {},
        isComplete: false,
        isConfirmed: false
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in add-item-chat:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
