// AI の接続先を1か所にまとめる
//
// 以前は7つの Edge Function がそれぞれ Lovable のゲートウェイURLと
// LOVABLE_API_KEY を直書きしていた。乗り換えるたびに7ファイルを触ることになるので、
// 接続先・鍵・モデル名だけをここに集めた。
// リクエストの組み立てとエラー処理は各関数のまま（文言も返し方も関数ごとに違うため）。
//
// Vercel の AI Gateway は Lovable と同じ形をしている。
//   - OpenAI 互換の /v1/chat/completions
//   - 画像生成は modalities: ["image","text"]
//   - 結果は choices[0].message.images[0].image_url.url
// だから差し替えるのは URL と鍵とモデル名だけで済む。

/** 接続先。既定は Vercel の AI Gateway。 */
export const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ?? "https://ai-gateway.vercel.sh/v1/chat/completions";

/** Lovable 時代の接続先。鍵が LOVABLE_API_KEY しか無いときの退避先。 */
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * 文章用のモデル。
 *
 * google/gemini-2.5-flash は Vercel の一覧にもそのまま存在するので、
 * Lovable 時代と同じものを使い続けられる（2026-09 時点で確認）。
 */
export const AI_TEXT_MODEL = Deno.env.get("AI_TEXT_MODEL") ?? "google/gemini-2.5-flash";

/**
 * 画像生成・画像編集用のモデル。
 *
 * Lovable では google/gemini-2.5-flash-image-preview を指定していたが、
 * この「-preview」付きは Vercel の一覧に無い（2026-09 時点で確認）。
 * preview の取れた google/gemini-2.5-flash-image が同じ系列の後継なのでこちらを使う。
 */
export const AI_IMAGE_MODEL = Deno.env.get("AI_IMAGE_MODEL") ?? "google/gemini-2.5-flash-image";

/**
 * 接続先と鍵を返す。
 *
 * AI_GATEWAY_API_KEY があればそれを使う（Vercel への移行後はこちら）。
 * まだ無い場合は LOVABLE_API_KEY で Lovable のゲートウェイに繋ぐ。
 * 移行中に鍵の設定が漏れても止まらないようにしてあり、
 * 切り戻しも AI_GATEWAY_API_KEY を外すだけで済む。
 *
 * 両方無いときは投げる。呼び出し側がそれぞれの形で 500 を返す。
 */
export function resolveAiGateway(): { url: string; apiKey: string } {
  const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (gatewayKey) {
    return { url: AI_GATEWAY_URL, apiKey: gatewayKey };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    console.warn("AI_GATEWAY_API_KEY is not set; falling back to the Lovable gateway");
    return { url: LOVABLE_GATEWAY_URL, apiKey: lovableKey };
  }

  throw new Error("AI_GATEWAY_API_KEY is not configured");
}

/**
 * 画像を返すモデルのレスポンスから画像URLを取り出す。
 *
 * 5つの関数が同じ場所を掘っていたのでまとめた。
 * 見つからなければ null。呼び出し側がそれぞれの文言でエラーを返す。
 */
export function extractGeneratedImageUrl(data: unknown): string | null {
  const choice = (data as {
    choices?: Array<{
      message?: { images?: Array<{ image_url?: { url?: string } }> };
    }>;
  })?.choices?.[0];
  return choice?.message?.images?.[0]?.image_url?.url ?? null;
}
