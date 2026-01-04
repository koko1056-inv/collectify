import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = "";
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Lovable; proxy-image)",
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgents[i % userAgents.length],
          "Accept": "image/*,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.9",
          "Referer": new URL(url).origin,
        },
      });

      if (response.ok) {
        return response;
      }

      // 403/401の場合は別のUser-Agentで再試行
      if (response.status === 403 || response.status === 401) {
        console.log(`Retry ${i + 1}/${retries} due to status ${response.status}`);
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      // その他のエラーは即座に失敗
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Retry ${i + 1}/${retries} due to error:`, lastError.message);
      
      // 少し待ってから再試行
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);

    const targetUrl =
      req.method === "GET"
        ? requestUrl.searchParams.get("url")
        : (await req.json())?.url;

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("proxy-image: fetching", targetUrl);

    const imageResponse = await fetchWithRetry(targetUrl);
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Validate content type
    if (!contentType.startsWith("image/")) {
      console.error("proxy-image: not an image:", contentType);
      return new Response(
        JSON.stringify({ error: "URL does not point to an image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For <img src> usage (GET)
    if (req.method === "GET") {
      return new Response(imageResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // For client-side processing (POST via supabase.functions.invoke)
    const buffer = await imageResponse.arrayBuffer();
    
    // Validate size (max 10MB)
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Image too large (max 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBlob = bufferToBase64(buffer);

    console.log("proxy-image: success, size:", buffer.byteLength);

    return new Response(JSON.stringify({ imageBlob, contentType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in proxy-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to fetch image",
        suggestion: "画像を直接アップロードしてください"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
