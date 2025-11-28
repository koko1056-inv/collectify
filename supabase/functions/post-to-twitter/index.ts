import { createHmac } from "node:crypto";

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

  console.log("Signature Base String:", signatureBaseString);
  console.log("Signing Key:", signingKey);
  console.log("Generated Signature:", signature);

  return signature;
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
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

async function uploadMedia(imageUrl: string): Promise<string> {
  // 画像をダウンロード
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  
  // Twitter Media Upload APIを使用（v1.1エンドポイント）
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const method = "POST";
  
  const formData = new FormData();
  formData.append('media', new Blob([imageBuffer]), 'image.png');
  
  const oauthHeader = generateOAuthHeader(method, uploadUrl);
  
  const response = await fetch(uploadUrl, {
    method: method,
    headers: {
      Authorization: oauthHeader,
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log("Media Upload Response:", responseText);

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
  console.log("OAuth Header:", oauthHeader);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const responseText = await response.text();
  console.log("Response Body:", responseText);

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

Deno.serve(async (req) => {
  try {
    validateEnvironmentVariables();
    
    const body = await req.json();
    const { text, imageUrl } = body;

    if (!text) {
      throw new Error("Tweet text is required");
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
    
    return new Response(JSON.stringify(tweet), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  } catch (error: any) {
    console.error("An error occurred:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
});
