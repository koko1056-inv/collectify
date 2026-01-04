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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);

    const targetUrl =
      req.method === "GET"
        ? requestUrl.searchParams.get("url")
        : (await req.json())?.url;

    if (!targetUrl) throw new Error("URL is required");

    console.log("proxy-image: fetching", targetUrl);

    const imageResponse = await fetch(targetUrl, {
      headers: {
        // Some hosts block requests without UA
        "User-Agent": "Mozilla/5.0 (Lovable; proxy-image)",
      },
    });

    if (!imageResponse.ok) {
      const text = await imageResponse.text().catch(() => "");
      console.error("proxy-image: fetch failed", imageResponse.status, text);
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // For <img src> usage
    if (req.method === "GET") {
      return new Response(imageResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          // cache for 1 day
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // For client-side processing (supabase.functions.invoke)
    const buffer = await imageResponse.arrayBuffer();
    const imageBlob = bufferToBase64(buffer);

    return new Response(JSON.stringify({ imageBlob, contentType }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in proxy-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
