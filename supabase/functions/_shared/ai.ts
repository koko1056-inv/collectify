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
//     こちらに移ってきた形。URL は呼び出し元のユーザーが渡したものなので、
//     取得は _shared/ssrf.ts の safeFetch を通す（内部アドレス・大きすぎる・画像でないものは
//     SsrfError で止まる）。
//   * messages ではなく contents。system は systemInstruction に分離し、
//     assistant ロールは model という名前になる。
//   * 画像出力は generationConfig.responseModalities: ["TEXT","IMAGE"] で要求し、
//     結果は candidates[0].content.parts[].inlineData に base64 で返る。
//
// なお Google の OpenAI 互換層は使っていない。あちらの画像生成は
// /v1/images/generations という別エンドポイントで参照画像を渡せず、
// アバターやグッズを忠実に再現する用途には使えないため。

import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import {
  mediaType,
  parsePublicHttpsUrl,
  readBodyCapped,
  safeFetch,
  sniffImageMediaType,
  SsrfError,
} from "./ssrf.ts";

// 呼び出し側が instanceof で 400 に振り分けられるように、ここからも出しておく
export { SsrfError };

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
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** 参照画像1枚の取得にかける時間の上限（本文の読み込みも含む）とリダイレクトの上限。 */
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_FETCH_MAX_REDIRECTS = 3;

/** 種類をはっきり名乗らない応答。中身の先頭バイトで画像か確かめる。 */
const SNIFF_MEDIA_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream", "text/plain"]);

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

  // 参照画像の URL は接続先によらず同じ形の検査を通す（不正なら SsrfError）。
  // ゲートウェイ経由では URL のまま渡して向こうが取りに行くが、Gemini 直結ではここから取りに行く。
  for (const message of options.messages) {
    if (typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type === "image_url") assertReferenceImageUrl(part.image_url?.url);
    }
  }

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
    // 参照画像を用意できなければ生成しても意味がないので投げ直す。
    // inlineImage の失敗は SsrfError なので、呼び出し側は referenceImageError で 400 / 502 にできる。
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

// ────────────────────────────── 参照画像 ──────────────────────────────

const DATA_URL_RE = /^data:([^;,]+);base64,(.+)$/;

/**
 * 参照画像の URL を、取りに行く前に形だけ確かめる（DNS は引かない）。
 * data:image/…;base64 か、公開ホストの https のみ。だめなら SsrfError（status 400）を投げる。
 *
 * 呼び出し側はポイントを消費する前にこれを通しておくと、明らかに不正な URL で
 * 消費と返金を往復させずに 400 を返せる。取得の段階の検査（DNS・リダイレクト・大きさ・種類）は
 * callAi の中（inlineImage）で行う。
 */
export function assertReferenceImageUrl(raw: unknown): void {
  if (typeof raw === "string" && raw.startsWith("data:")) {
    const m = raw.match(DATA_URL_RE);
    if (!m || !isImageMediaType(m[1].toLowerCase(), true)) throw new SsrfError("Invalid image data");
    return;
  }
  parsePublicHttpsUrl(raw);
}

/**
 * callAi が投げた参照画像のエラー（SsrfError）を、呼び出し側が返す形にする。
 * URL が不正・内部向け・画像でない・大きすぎる → 400。相手の都合で取れなかった・時間切れ → 502。
 *
 * error は画面にそのまま出してよい文言（既存の画面は error を表示している）、code は機械向けの種類、
 * message は SsrfError の文言だけ（内部の IP などは入っていない）。
 */
export function referenceImageError(e: SsrfError): {
  status: 400 | 502;
  body: { error: string; code: "invalid_image_url" | "image_fetch_failed"; message: string };
} {
  return e.status < 500
    ? {
      status: 400,
      body: { error: "参照画像を使えませんでした。別の画像でお試しください。", code: "invalid_image_url", message: e.message },
    }
    : {
      status: 502,
      body: { error: "参照画像を読み込めませんでした。しばらくしてからお試しください。", code: "image_fetch_failed", message: e.message },
    };
}

function isImageMediaType(type: string, allowOctetStream = false): boolean {
  if (allowOctetStream && type === "application/octet-stream") return true;
  // SVG はスクリプトを含められ、Gemini も受け取らないので通さない
  return type.startsWith("image/") && !type.startsWith("image/svg");
}

/**
 * 参照画像を inline_data に変換する。
 *
 * data URL はそのまま分解する（種類が octet-stream なら先頭バイトで当て直す）。
 * http(s) は SSRF 対策つき（safeFetch: https のみ・内部アドレス拒否・DNS とリダイレクトをホップごとに検査・
 * 時間とリダイレクト回数の上限）で取得し、image/* であること・大きさの上限を確かめてから base64 にする。
 * Gemini は画像URLを受け取らないため、この変換は省略できない。
 *
 * 失敗はすべて SsrfError で投げる（呼び出し側は referenceImageError で 400 / 502 に振り分ける）。
 */
async function inlineImage(
  url: string,
  budget: { used: number }
): Promise<{ mime_type: string; data: string }> {
  const dataUrlMatch = url.match(DATA_URL_RE);
  if (dataUrlMatch) {
    const declared = dataUrlMatch[1].toLowerCase();
    if (!isImageMediaType(declared, true)) throw new SsrfError("Invalid image data");
    if (declared !== "application/octet-stream") {
      return { mime_type: declared, data: dataUrlMatch[2] };
    }
    // 端末によっては種類が空のまま読み込まれる。先頭だけ復号して種類を当てる
    let head: Uint8Array;
    try {
      head = decodeBase64(dataUrlMatch[2].replace(/\s/g, "").slice(0, 32));
    } catch {
      throw new SsrfError("Invalid image data");
    }
    const sniffed = sniffImageMediaType(head);
    if (!sniffed) throw new SsrfError("Invalid image data");
    return { mime_type: sniffed, data: dataUrlMatch[2] };
  }

  // https のみ・IP 直指定や内部ホスト名は拒否（DNS とリダイレクトの検査は safeFetch がホップごとに行う）
  const target = parsePublicHttpsUrl(url);

  let response: Response;
  try {
    ({ response } = await safeFetch(target, {
      timeoutMs: IMAGE_FETCH_TIMEOUT_MS,
      maxRedirects: IMAGE_FETCH_MAX_REDIRECTS,
      headers: () => ({ Accept: "image/*" }),
    }));
  } catch (e) {
    if (e instanceof SsrfError) throw e;
    // 時間切れ・接続できないなど。中身はログにだけ出す
    console.error("ai: reference image fetch failed:", e instanceof Error ? e.name : String(e));
    throw new SsrfError("Failed to fetch the reference image", 502);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new SsrfError("Failed to fetch the reference image", 502);
  }

  const declared = mediaType(response);
  const needsSniff = SNIFF_MEDIA_TYPES.has(declared);
  if (!needsSniff && !isImageMediaType(declared)) {
    await response.body?.cancel().catch(() => {});
    throw new SsrfError("URL does not point to an image");
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBodyCapped(response, MAX_IMAGE_BYTES);
  } catch (e) {
    if (e instanceof SsrfError) throw new SsrfError("Reference image is too large", 413);
    console.error("ai: reference image read failed:", e instanceof Error ? e.name : String(e));
    throw new SsrfError("Failed to fetch the reference image", 502);
  }
  if (bytes.byteLength === 0) throw new SsrfError("Failed to fetch the reference image", 502);

  const mimeType = needsSniff ? sniffImageMediaType(bytes) : declared;
  if (!mimeType) throw new SsrfError("URL does not point to an image");

  budget.used += bytes.byteLength;
  if (budget.used > MAX_TOTAL_IMAGE_BYTES) {
    throw new SsrfError("Reference images are too large in total", 413);
  }

  return { mime_type: mimeType, data: encodeBase64(bytes) };
}
