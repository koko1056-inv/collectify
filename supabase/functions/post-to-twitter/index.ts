import { createHmac } from "node:crypto";
import {
  corsHeadersFor,
  jsonResponse,
  readJson,
  requireAdmin,
  checkRateLimit,
  rateLimitedResponse,
} from "../_shared/security.ts";
import { assertPublicHttpsUrl, mediaType, readBodyCapped, safeFetch, SsrfError } from "../_shared/ssrf.ts";

const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

function validateEnvironmentVariables() {
  if (!API_KEY) {
    throw new Error("Missing TWITTER_CONSUMER_KEY environment variable");
  }
  if (!API_SECRET) {
    throw new Error("Missing TWITTER_CONSUMER_SECRET environment variable");
  }
  if (!ACCESS_TOKEN) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN environment variable");
  }
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET environment variable");
  }
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");

  return signature;
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    API_SECRET!,
    ACCESS_TOKEN_SECRET!
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

const BASE_URL = "https://api.x.com/2";

// Twitter の画像アップロードの上限は 5MB
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

async function uploadMedia(imageUrl: URL): Promise<string> {
  // 画像をダウンロード（SSRF 対策・サイズ上限・画像の種類チェックつき）
  const { response: imageResponse } = await safeFetch(imageUrl, { timeoutMs: 15_000 });
  if (!imageResponse.ok) {
    await imageResponse.body?.cancel().catch(() => {});
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }
  const type = mediaType(imageResponse);
  if (!ALLOWED_MEDIA_TYPES.includes(type)) {
    await imageResponse.body?.cancel().catch(() => {});
    throw new Error(`Unsupported image type: ${type}`);
  }
  const imageBytes = await readBodyCapped(imageResponse, MAX_MEDIA_BYTES);

  // Twitter Media Upload APIを使用（v1.1エンドポイント）
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const method = "POST";

  const formData = new FormData();
  formData.append('media', new Blob([imageBytes as unknown as BlobPart], { type }), 'image.png');

  const oauthHeader = generateOAuthHeader(method, uploadUrl);

  const response = await fetch(uploadUrl, {
    method: method,
    headers: {
      Authorization: oauthHeader,
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Media upload failed! status: ${response.status}, body: ${responseText}`
    );
  }

  const result = JSON.parse(responseText);
  return result.media_id_string;
}

async function sendTweet(tweetText: string, mediaId?: string): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  const params: any = { text: tweetText };
  
  if (mediaId) {
    params.media = { media_ids: [mediaId] };
  }

  const oauthHeader = generateOAuthHeader(method, url);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

// ツイート本文の上限（X の上限は重み付きで280。ここでは文字数の粗い上限にとどめる）
const MAX_TWEET_CHARS = 280;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return jsonResponse(cors, { error: "Method not allowed" }, 405);
  }

  // 公式アカウントとして投稿するので、ログイン済みの管理者だけ
  const auth = await requireAdmin(req, cors);
  if (!auth.ok) return auth.response;

  // 暫定のレート制限（インスタンス単位。詳細は _shared/security.ts の TODO）
  const limit = checkRateLimit(`post-to-twitter:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return rateLimitedResponse(cors, limit.retryAfterSec);

  try {
    validateEnvironmentVariables();

    const body = await readJson(req);
    if (!body) {
      return jsonResponse(cors, { error: "Invalid request body" }, 400);
    }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return jsonResponse(cors, { error: "Tweet text is required" }, 400);
    }
    if (text.length > MAX_TWEET_CHARS) {
      return jsonResponse(cors, { error: "Tweet text is too long" }, 400);
    }

    // 画像URLは先に検査する（内部アドレスなどは黙って無視せず 400 にする）
    let imageUrl: URL | undefined;
    if (body.imageUrl !== undefined && body.imageUrl !== null && body.imageUrl !== "") {
      try {
        imageUrl = await assertPublicHttpsUrl(body.imageUrl);
      } catch (e) {
        if (e instanceof SsrfError) return jsonResponse(cors, { error: e.message }, 400);
        throw e;
      }
    }

    let mediaId: string | undefined;

    // 画像がある場合はアップロード
    if (imageUrl) {
      try {
        mediaId = await uploadMedia(imageUrl);
        console.log("Media uploaded, ID:", mediaId);
      } catch (error) {
        console.error("Error uploading media:", error);
        // 画像アップロードに失敗してもテキストのみで投稿
      }
    }

    // ツイートを投稿
    const tweet = await sendTweet(text, mediaId);

    return jsonResponse(cors, tweet);
  } catch (error) {
    // 詳細（Twitter の応答や環境変数名）はログにだけ残し、クライアントには返さない
    console.error("An error occurred:", error);
    return jsonResponse(cors, { error: "ツイートの投稿に失敗しました" }, 500);
  }
});
