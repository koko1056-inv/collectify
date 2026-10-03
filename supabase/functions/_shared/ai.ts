// AI の接続先を1か所にまとめる
//
// 7つの Edge Function がここを通して AI を呼ぶ。接続先ごとに通信の形が違うので、
// その差をこのファイルに閉じ込めてある。呼び出し側は OpenAI 形式の messages を
// 組み立てて callAi() に渡すだけでよく、エラー文言と HTTP ステータスの扱いは
// 各関数のまま（429/402 の文言も返し方も関数ごとに違うため）。
//
// 対応している接続先は3つ。鍵がある方が優先される。
//
//   1. GEMINI_API_KEY      → Google の Gemini API に直接
//   2. AI_GATEWAY_API_KEY  → Vercel AI Gateway（OpenAI 互換）
//   3. LOVABLE_API_KEY     → Lovable のゲートウェイ（OpenAI 互換・移行前の退避先）
//
// 切り替えは環境変数だけで済み、デプロイは不要。切り戻しも鍵を外すだけ。
//
// ── Gemini 直結で形が変わる点 ──
//
// Vercel と Lovable は OpenAI 互換なので、リクエストもレスポンスもそのまま通る。
// Gemini のネイティブAPIは別物で、次の3点が違う。
//
//   * 参照画像を URL で渡せない。inline_data（base64）にする必要があるため、
//     この層で画像を取得して埋め込む。ゲートウェイが裏でやっていた処理が
//     こちらに移ってきた形。
//   * messages ではなく contents。system は systemInstruction に分離し、
//     assistant ロールは model という名前になる。
//   * 画像出力は generationConfig.responseModalities: ["TEXT","IMAGE"] で要求し、
//     結果は candidates[0].content.parts[].inlineData に base64 で返る。
//
// なお Google の OpenAI 互換層は使っていない。あちらの画像生成は
// /v1/images/generations という別エンドポイントで参照画像を渡せず、
// アバターやグッズを忠実に再現する用途には使えないため。

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const VERCEL_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * 文章用のモデル。
 *
 * Gemini 直結のときは先頭の "google/" を落として使う（あちらは接頭辞なしの
 * gemini-2.5-flash が正しい名前）。ゲートウェイ経由ではプロバイダを示す
 * 接頭辞が必要なので、既定値は接頭辞つきのまま置いてある。
 */
export const AI_TEXT_MODEL = Deno.env.get("AI_TEXT_MODEL") ?? "google/gemini-2.5-flash";

/** 画像生成・画像編集用のモデル。接頭辞の扱いは AI_TEXT_MODEL と同じ。 */
export const AI_IMAGE_MODEL = Deno.env.get("AI_IMAGE_MODEL") ?? "google/gemini-2.5-flash-image";

/** 埋め込む参照画像1枚あたりの上限。これを超えるものは弾く。 */
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

/** 1リクエストに埋め込む参照画像の合計上限。Gemini の受け取れる大きさに収めるため。 */
const MAX_TOTAL_IMAGE_BYTES = 14 * 1024 * 1024;

type Provider = "gemini" | "vercel" | "lovable";

/** OpenAI 形式のメッセージ。呼び出し側はこの形で組み立てる。 */
export interface AiMessage {
  role: string;
  content: string | AiContentPart[];
}

export type AiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

export interface CallAiOptions {
  messages: AiMessage[];
  /** true なら画像を生成させる。モデルも画像用に切り替わる。 */
  wantImage?: boolean;
  /** true なら JSON だけを返させる。 */
  jsonOutput?: boolean;
  temperature?: number;
}

/**
 * 呼び出し結果。
 *
 * fetch の Response をそのまま返さないのは、接続先によって
 * レスポンスの形が違うため。ok と status は呼び出し側が
 * これまでどおり 429/402 で分岐できるように残してある。
 */
export interface AiResult {
  ok: boolean;
  status: number;
  /** HTTP のステータス文。呼び出し側の既存のエラー文言で使っている。 */
  statusText: string;
  /** 失敗時の本文。ログ出力用。 */
  errorText: string;
  /** 文章の出力。無ければ null。 */
  text: string | null;
  /** 生成された画像の data URL。無ければ null。 */
  imageUrl: string | null;
}

/**
 * どの接続先を使うかを決める。
 *
 * 鍵が1つも無いときは投げる。呼び出し側がそれぞれの形で 500 を返す。
 */
function resolveProvider(): { provider: Provider; apiKey: string } {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) return { provider: "gemini", apiKey: geminiKey };

  const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (gatewayKey) return { provider: "vercel", apiKey: gatewayKey };

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    console.warn("GEMINI_API_KEY / AI_GATEWAY_API_KEY is not set; falling back to the Lovable gateway");
    return { provider: "lovable", apiKey: lovableKey };
  }

  throw new Error("GEMINI_API_KEY is not configured");
}

/** 現在の接続先の名前。ログに出す用。 */
export function currentAiProvider(): string {
  try {
    return resolveProvider().provider;
  } catch {
    return "none";
  }
}

/** AI を呼ぶ。接続先ごとの差はこの中で吸収する。 */
export async function callAi(options: CallAiOptions): Promise<AiResult> {
  const { provider, apiKey } = resolveProvider();
  const model = options.wantImage ? AI_IMAGE_MODEL : AI_TEXT_MODEL;

  if (provider === "gemini") {
    return await callGemini(apiKey, model, options);
  }
  const url = provider === "vercel" ? VERCEL_GATEWAY_URL : LOVABLE_GATEWAY_URL;
  return await callOpenAiCompatible(url, apiKey, model, options);
}

// ────────────────────────────── OpenAI 互換（Vercel / Lovable） ──────────────────────────────

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  options: CallAiOptions
): Promise<AiResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // undefined のフィールドは JSON.stringify が落とすので、
    // 必要なときだけ付く形になる。
    body: JSON.stringify({
      model,
      messages: options.messages,
      modalities: options.wantImage ? ["image", "text"] : undefined,
      response_format: options.jsonOutput ? { type: "json_object" } : undefined,
      temperature: options.temperature,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      errorText: await response.text(),
      text: null,
      imageUrl: null,
    };
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    errorText: "",
    text: typeof message?.content === "string" ? message.content : null,
    imageUrl: message?.images?.[0]?.image_url?.url ?? null,
  };
}

// ────────────────────────────── Gemini ネイティブ ──────────────────────────────

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(
  apiKey: string,
  model: string,
  options: CallAiOptions
): Promise<AiResult> {
  // ゲートウェイ用の "google/" 接頭辞は Gemini 直結では付けない。
  const geminiModel = model.replace(/^google\//, "");

  // system はメッセージ列から分離する（Gemini は systemInstruction という別枠）。
  const systemTexts: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }> = [];

  // 画像の取得はまとめて並列で行う。1件ずつ待つと
  // 参照画像5枚のルーム生成で待ち時間が積み上がるため。
  const budget = { used: 0 };
  const inlineJobs: Array<Promise<void>> = [];

  for (const message of options.messages) {
    if (message.role === "system") {
      systemTexts.push(contentToPlainText(message.content));
      continue;
    }

    const parts: GeminiPart[] = [];
    if (typeof message.content === "string") {
      parts.push({ text: message.content });
    } else {
      for (const part of message.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
          continue;
        }
        // place-holder を先に入れておき、取得できたら中身を埋める。
        // こうすると画像の並び順（アバター→グッズ など）が崩れない。
        const slot: GeminiPart = {};
        parts.push(slot);
        inlineJobs.push(
          inlineImage(part.image_url.url, budget).then((inline) => {
            slot.inline_data = inline;
          })
        );
      }
    }

    contents.push({
      role: message.role === "assistant" || message.role === "model" ? "model" : "user",
      parts,
    });
  }

  try {
    await Promise.all(inlineJobs);
  } catch (error) {
    // 参照画像を用意できなければ生成しても意味がないので、
    // 呼び出し側が 500 として扱えるように投げ直す。
    throw error instanceof Error ? error : new Error(String(error));
  }

  // 取得に失敗して空のままになった枠は落とす（inlineImage が投げるので通常は起きない）。
  for (const content of contents) {
    content.parts = content.parts.filter((part) => part.text !== undefined || part.inline_data);
  }

  const generationConfig: Record<string, unknown> = {};
  if (options.wantImage) generationConfig.responseModalities = ["TEXT", "IMAGE"];
  if (options.jsonOutput) generationConfig.responseMimeType = "application/json";
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature;

  const body: Record<string, unknown> = { contents };
  if (systemTexts.length > 0) {
    body.systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  }
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/${geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        // 鍵はクエリではなくヘッダで送る。URL はログに残りやすいため。
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      errorText: await response.text(),
      text: null,
      imageUrl: null,
    };
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  const texts: string[] = [];
  let imageUrl: string | null = null;
  for (const part of parts) {
    if (typeof part?.text === "string") texts.push(part.text);
    // レスポンスは camelCase の inlineData で返るが、念のため両方見る。
    const inline = part?.inlineData ?? part?.inline_data;
    if (!imageUrl && inline?.data) {
      const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
      imageUrl = `data:${mimeType};base64,${inline.data}`;
    }
  }

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    errorText: "",
    text: texts.length > 0 ? texts.join("") : null,
    imageUrl,
  };
}

function contentToPlainText(content: string | AiContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/**
 * 参照画像を inline_data に変換する。
 *
 * data URL はそのまま分解する。http(s) は取得して base64 にする。
 * Gemini は画像URLを受け取らないため、この変換は省略できない。
 */
async function inlineImage(
  url: string,
  budget: { used: number }
): Promise<{ mime_type: string; data: string }> {
  const dataUrlMatch = url.match(/^data:([^;,]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { mime_type: dataUrlMatch[1], data: dataUrlMatch[2] };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("参照画像のURLが不正です");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`参照画像を取得できませんでした (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("参照画像が大きすぎます");
  }
  budget.used += bytes.byteLength;
  if (budget.used > MAX_TOTAL_IMAGE_BYTES) {
    throw new Error("参照画像の合計サイズが大きすぎます");
  }

  // content-type が信用できない配信元もあるので、image/* でなければ png 扱いにする。
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const mimeType = contentType?.startsWith("image/") ? contentType : "image/png";

  return { mime_type: mimeType, data: encodeBase64(bytes) };
}
