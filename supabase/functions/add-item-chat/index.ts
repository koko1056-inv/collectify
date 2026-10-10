import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAi, currentAiProvider } from "../_shared/ai.ts";
import {
  checkRateLimit,
  corsHeadersFor,
  jsonResponse,
  rateLimitedResponse,
  readJson,
  requireUser,
} from "../_shared/security.ts";
import { assertPublicHttpsUrl, SsrfError } from "../_shared/ssrf.ts";

// 入力の上限
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 2000;
const MAX_IMAGES = 3;
const MAX_DATA_URL_CHARS = 6 * 1024 * 1024; // 1枚あたり（base64 の文字数）
const MAX_TOTAL_DATA_URL_CHARS = 12 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

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
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ログイン必須（anon キーだけの呼び出しは 401）
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body = await readJson(req);
    const messages = body?.messages;

    // 入力の検査。role を user / assistant に限るのは、system を名乗る
    // メッセージでシステムプロンプトを上書きされるのを防ぐため。
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return jsonResponse(corsHeaders, { error: "Invalid messages" }, 400);
    }

    let imageCount = 0;
    let totalDataChars = 0;
    const checked: Array<{ role: "user" | "assistant"; content: string; imageUrl?: string }> = [];
    for (const raw of messages) {
      const msg = raw as { role?: unknown; content?: unknown; imageUrl?: unknown };
      if (msg?.role !== "user" && msg?.role !== "assistant") {
        return jsonResponse(corsHeaders, { error: "Invalid messages" }, 400);
      }
      const content = msg.content === undefined || msg.content === null ? "" : msg.content;
      if (typeof content !== "string" || content.length > MAX_MESSAGE_CHARS) {
        return jsonResponse(corsHeaders, { error: "Message is too long" }, 400);
      }

      let imageUrl: string | undefined;
      if (msg.imageUrl !== undefined && msg.imageUrl !== null && msg.imageUrl !== "") {
        if (typeof msg.imageUrl !== "string") {
          return jsonResponse(corsHeaders, { error: "Invalid image" }, 400);
        }
        if (++imageCount > MAX_IMAGES) {
          return jsonResponse(corsHeaders, { error: "Too many images" }, 400);
        }
        if (msg.imageUrl.startsWith("data:")) {
          totalDataChars += msg.imageUrl.length;
          if (
            msg.imageUrl.length > MAX_DATA_URL_CHARS ||
            totalDataChars > MAX_TOTAL_DATA_URL_CHARS ||
            !DATA_IMAGE_PATTERN.test(msg.imageUrl)
          ) {
            return jsonResponse(corsHeaders, { error: "Invalid image" }, 400);
          }
        } else {
          // サーバー側で取りに行くので、内部アドレスを指す URL は拒否する
          try {
            await assertPublicHttpsUrl(msg.imageUrl);
          } catch (e) {
            if (e instanceof SsrfError) return jsonResponse(corsHeaders, { error: e.message }, 400);
            throw e;
          }
        }
        imageUrl = msg.imageUrl;
      }
      checked.push({ role: msg.role, content, imageUrl });
    }

    // 1時間に60メッセージまで（チャットなので多めに）
    // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限に置き換えること（_shared/security.ts 参照）
    const limit = checkRateLimit(`add-item-chat:${auth.user.id}`, 60, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec);

    // Build messages array with image if provided
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...checked.map((msg) => {
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

    const response = await callAi({
      messages: apiMessages as any,
      temperature: 0.7,
    });

    if (!response.ok) {
      console.error("AI error:", currentAiProvider(), response.status, response.errorText);

      if (response.status === 429) {
        return jsonResponse(corsHeaders, { error: "レート制限に達しました。少し待ってからお試しください。" }, 429);
      }
      if (response.status === 402) {
        return jsonResponse(corsHeaders, { error: "クレジットが不足しています。" }, 402);
      }
      throw new Error("AI gateway error");
    }

    const content = response.text ?? "";

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

    return jsonResponse(corsHeaders, parsed);
  } catch (error) {
    console.error("Error in add-item-chat:", error);
    // 内部のエラー文言はクライアントに返さない
    return jsonResponse(corsHeaders, { error: "チャットの処理に失敗しました" }, 500);
  }
});
