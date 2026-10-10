import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hostMatches, mediaType, readBodyCapped, safeFetch, SsrfError } from "../_shared/ssrf.ts";

// 画像だけを返す公開の中継なので、CORS は全許可のまま（認証なし・<img src> から直接呼ばれる）。
// 呼び出し側の契約（GET ?url=<エンコード済みURL> / POST {url}）は変えていない。
//   src/utils/optimized-image.ts の toProxyUrl
//   src/components/ui/lazy-image.tsx
//   src/components/item-details/ItemImageEditor.tsx
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** 中継する画像1枚の上限。GET でも POST でも、ストリームで読んで超えたら打ち切る。 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * 中継してよいホストの既定の一覧。完全一致、または "*.example.com"（サブドメインのみ）。
 * これ以外のホストの URL は取りに行かない（任意の URL を中継する踏み台にしない）。
 *
 * 追加するときは、コードを直さずに Edge Function の環境変数
 * PROXY_IMAGE_ALLOWED_HOSTS（カンマ区切り。"*.example.com" 可）でもできる。
 */
const DEFAULT_ALLOWED_HOSTS = [
  // Shopify 系ストア（official_items の大半）
  "cdn.shopify.com",
  // 公式ストア・カタログの取り込み元（docs/catalog-import.md）
  "shop.nijisanji.jp",
  "amnibus.com",
  "www.amnibus.com",
  "cdn.amnibus.com",
  "shop.sanrio.co.jp",
  "ws-tcg.com",
  "www.ws-tcg.com",
  "*.ltr-online.com", // images.ltr-online.com / ringojam-cafe.ltr-online.com など
  "mrsgreenapple.com",
  "www.mrsgreenapple.com",
  "taito.co.jp",
  "www.taito.co.jp",
  "bsp-prize.jp",
  "www.bsp-prize.jp",
  "onepiece-cardgame.com",
  "www.onepiece-cardgame.com",
  // ユーザーが貼ることが多い画像置き場（下の imgur の小画像ガードがある）
  "i.imgur.com",
  "imgur.com",
  // このプロジェクト自身の Supabase（Storage）
  "dmgrgzysrzzgsajwqyrh.supabase.co",
];

function supabaseHost(): string | null {
  try {
    const raw = Deno.env.get("SUPABASE_URL");
    return raw ? new URL(raw).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

function allowedHosts(): string[] {
  const extra = (Deno.env.get("PROXY_IMAGE_ALLOWED_HOSTS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const own = supabaseHost();
  return [...DEFAULT_ALLOWED_HOSTS, ...(own ? [own] : []), ...extra];
}

/** 許可リストの検査。リダイレクトのホップごとにも呼ぶ。 */
function assertAllowedUrl(url: URL): void {
  if (!hostMatches(url.hostname, allowedHosts())) {
    throw new SsrfError("This image host is not allowed", 403);
  }
  // 自プロジェクトの Supabase は Storage の公開オブジェクトだけ（REST や Auth には触れさせない）
  const own = supabaseHost();
  const isOwnSupabase = url.hostname === "dmgrgzysrzzgsajwqyrh.supabase.co" || url.hostname === own;
  if (isOwnSupabase && !url.pathname.startsWith("/storage/v1/")) {
    throw new SsrfError("This image host is not allowed", 403);
  }
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 取得失敗を表す（内部の詳細は含めない）。リトライしない失敗に使う。 */
class UpstreamError extends Error {}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Lovable; proxy-image)",
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      // リダイレクトは最大3回、ホップごとに SSRF 検査と許可リストを再確認する。
      // Referer は許可リストのホスト自身のオリジンにする（ホットリンク防止の回避。従来どおり）。
      const { response } = await safeFetch(url, {
        maxRedirects: 3,
        timeoutMs: 15_000,
        allowDnsUnavailable: true, // 許可リストで接続先を絞っているので、DNS 検査が使えない環境では通す
        validateUrl: assertAllowedUrl,
        headers: (u) => ({
          "User-Agent": userAgents[i % userAgents.length],
          "Accept": "image/*,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.9",
          "Referer": u.origin,
        }),
      });

      if (response.ok) {
        return response;
      }
      await response.body?.cancel().catch(() => {});

      // 403/401の場合は別のUser-Agentで再試行
      if (response.status === 403 || response.status === 401) {
        console.log(`Retry ${i + 1}/${retries} due to status ${response.status}`);
        lastError = new UpstreamError(`HTTP ${response.status}`);
        continue;
      }

      // その他のエラーは即座に失敗
      throw new UpstreamError(`HTTP ${response.status}`);
    } catch (error) {
      // 許可リスト・SSRF 検査の拒否や上流の即時失敗は、リトライしても結果が変わらない
      if (error instanceof SsrfError || error instanceof UpstreamError) {
        throw error;
      }
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

function jsonError(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);

    const isReadMethod = req.method === "GET" || req.method === "HEAD";
    let targetUrl: unknown;
    if (isReadMethod) {
      targetUrl = requestUrl.searchParams.get("url");
    } else {
      try {
        targetUrl = (await req.json())?.url;
      } catch {
        return jsonError({ error: "Invalid request body" }, 400);
      }
    }

    if (!targetUrl || typeof targetUrl !== "string") {
      return jsonError({ error: "URL is required" }, 400);
    }

    // 入口で形と許可リストを検査する（DNS の検査と再確認は fetchWithRetry の中でホップごとに行う）
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "https:") {
        return jsonError({ error: "Invalid URL: only https is allowed" }, 400);
      }
      assertAllowedUrl(parsed);
    } catch (e) {
      if (e instanceof SsrfError) return jsonError({ error: e.message }, e.status);
      return jsonError({ error: "Invalid URL" }, 400);
    }

    console.log("proxy-image: fetching", targetUrl);

    const imageResponse = await fetchWithRetry(targetUrl);
    const contentType = mediaType(imageResponse);

    // 画像だけを返す。SVG はスクリプトを含められるので返さない。
    if (!contentType.startsWith("image/") || contentType.startsWith("image/svg")) {
      await imageResponse.body?.cancel().catch(() => {});
      console.error("proxy-image: not an allowed image type:", contentType);
      return jsonError({ error: "URL does not point to an image" }, 400);
    }

    // 上限を超えたらストリームの途中で打ち切る（GET / POST 共通）
    const bytes = await readBodyCapped(imageResponse, MAX_IMAGE_BYTES);

    // For <img src> usage (GET/HEAD) - バッファリングしてから返す
    if (isReadMethod) {
      return new Response(bytes as unknown as BodyInit, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      });
    }

    // For client-side processing (POST via supabase.functions.invoke)

    // Guard: Imgur sometimes returns a tiny "image not available" placeholder.
    // Treat very small images from imgur as a failure so the client can ask for direct upload.
    try {
      const host = new URL(targetUrl).hostname;
      if (host.endsWith("imgur.com") && bytes.byteLength < 5 * 1024) {
        return new Response(
          JSON.stringify({
            error: "画像が見つからない(または削除済み)可能性があります",
            suggestion: "画像を直接アップロードしてください",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      // ignore
    }

    const imageBlob = bufferToBase64(bytes);

    console.log("proxy-image: success, size:", bytes.byteLength);

    return new Response(JSON.stringify({ imageBlob, contentType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in proxy-image function:", error);

    // 内部の詳細は返さない。検査で弾いた理由（固定の文言）と、それ以外の一般的な失敗だけ。
    const isGuardError = error instanceof SsrfError;
    const message = isGuardError ? (error as SsrfError).message : "Failed to fetch image";

    // GET/HEAD (imgタグ) の場合は、許可リスト外・不正な URL なら 4xx、
    // 取得に失敗しただけなら壊れた画像にならないよう 1x1 透明PNGを返す
    if (req.method === "GET" || req.method === "HEAD") {
      if (isGuardError) {
        return jsonError({ error: message }, (error as SsrfError).status === 403 ? 403 : 400);
      }
      const transparentPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAF3vKxkAAAAASUVORK5CYII=";
      const binary = atob(transparentPngBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      return new Response(bytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
        },
      });
    }

    // POST (supabase.functions.invoke) の場合は、ステータス200でエラー内容を返して
    // クライアント側が「登録は続行しつつ注意喚起」できるようにする
    return new Response(
      JSON.stringify({
        error: message,
        suggestion: "画像を直接アップロードしてください",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
