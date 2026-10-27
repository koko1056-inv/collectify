import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { callAi, currentAiProvider } from "../_shared/ai.ts";
import { isAdminUser, jsonResponse, readJson, requireUser } from "../_shared/security.ts";
import { consumeRateLimit, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import { mediaType, parsePublicHttpsUrl, readBodyCapped, safeFetch, SsrfError } from "../_shared/ssrf.ts";
import { cleanText, extractPageDescription, extractPageTitle } from "../_shared/html-meta.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ページの HTML は先頭 1MB まで、画像は 10MB まで読む
const MAX_HTML_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// data URL で直接送られてくる画像も同じ上限（base64 は元の約 4/3 倍）
const MAX_DATA_URL_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100;
const FETCH_TIMEOUT_MS = 10_000;

// ログインしている人なら誰でも使える。一般の人はユーザーごとに 1時間30回・1日150回まで（DB で数える）。
// 管理者（BulkImportModal で何十枚もまとめて読む）は対象外。
//
// URL は https のみ。ただし管理者（サーバー側の has_role('admin') で確かめる）だけは、
// まとめて登録で古い公式サイトの http:// の画像・ページを読めるように http も通す。
// その場合も内部アドレス・DNS・リダイレクトの検査はそのまま（_shared/ssrf.ts の allowHttp）。
const USER_LIMITS = { hour: 30, day: 150 };

// 端末によってはファイルの種類が空のまま読み込まれる（application/octet-stream）ので、それも通す
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+|application\/octet-stream);base64,[a-z0-9+/=\s]+$/i;

/** 渡された URL を使えないとき（形が不正・内部アドレス・大きすぎるなど）の 400 */
function invalidUrl(field: "imageUrl" | "sourceUrl", message: string): Response {
  return jsonResponse(corsHeaders, { error: "invalid_url", field, message }, 400);
}

/**
 * imageUrl を AI に渡せる data URL にする。
 *
 * http(s) の画像をここで（SSRF 対策つきで）取得しておき、AI 側（_shared/ai.ts の inlineImage や
 * ゲートウェイ）には data URL しか渡さない。こうすると、サーバーから未検査の URL を取りに行く経路が残らない。
 */
async function toImageDataUrl(raw: string, allowHttp: boolean): Promise<string> {
  if (raw.startsWith("data:")) {
    if (raw.length > MAX_DATA_URL_LENGTH) throw new SsrfError("Image is too large", 413);
    if (!DATA_URL_RE.test(raw)) throw new SsrfError("Invalid image data");
    return raw;
  }

  const url = parsePublicHttpsUrl(raw, { allowHttp });
  const { response } = await safeFetch(url, { timeoutMs: FETCH_TIMEOUT_MS, maxRedirects: 3, allowHttp });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new SsrfError("Failed to fetch the image", 502);
  }
  const type = mediaType(response);
  if (!type.startsWith("image/")) {
    await response.body?.cancel().catch(() => {});
    throw new SsrfError("URL does not point to an image");
  }
  const bytes = await readBodyCapped(response, MAX_IMAGE_BYTES);
  if (bytes.byteLength === 0) throw new SsrfError("Failed to fetch the image", 502);
  return `data:${type};base64,${encodeBase64(bytes)}`;
}

/** 商品ページを（SSRF 対策つきで）読んで、AI に渡すページ情報の文章にする。読めなければ空文字。 */
async function fetchPageContext(url: URL, allowHttp: boolean): Promise<string> {
  const { response, finalUrl } = await safeFetch(url, { timeoutMs: FETCH_TIMEOUT_MS, maxRedirects: 3, allowHttp });
  const type = mediaType(response);
  if (!response.ok || (type !== "text/html" && type !== "application/xhtml+xml")) {
    await response.body?.cancel().catch(() => {});
    return "";
  }
  const html = new TextDecoder().decode(await readBodyCapped(response, MAX_HTML_BYTES, { truncate: true }));

  const pageTitle = extractPageTitle(html) ?? "";
  const pageDesc = extractPageDescription(html) ?? "";

  // 本文からテキストを抽出（簡易版）
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyText = "";
  if (bodyMatch) {
    bodyText = cleanText(
      bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
    ).substring(0, 1000); // 最初の1000文字のみ
  }

  return `
ページURL: ${finalUrl.href}
ページタイトル: ${pageTitle}
ページ説明: ${pageDesc}
ページ内容の一部: ${bodyText}
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 認証チェック: auth.getUser() で本物のログインユーザーか確かめる（匿名・anon キーだけは 401）
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body = await readJson(req);
    const rawImageUrl = body?.imageUrl;
    const rawSourceUrl = body?.sourceUrl;

    if (typeof rawImageUrl !== 'string' || !rawImageUrl) {
      return jsonResponse(corsHeaders, { error: '画像URLが必要です' }, 400);
    }

    // http を通すのは管理者だけ。回数制限の除外にも使う
    const isAdmin = await isAdminUser(auth);
    const allowHttp = isAdmin;

    // 取りに行く前に形を確かめる。不正・内部向けの URL は 400 で返し、取りに行かない
    if (!rawImageUrl.startsWith('data:')) {
      try {
        parsePublicHttpsUrl(rawImageUrl, { allowHttp });
      } catch (e) {
        if (e instanceof SsrfError) return invalidUrl('imageUrl', e.message);
        throw e;
      }
    }
    let sourceUrl: URL | null = null;
    if (rawSourceUrl !== undefined && rawSourceUrl !== null && rawSourceUrl !== '') {
      try {
        sourceUrl = parsePublicHttpsUrl(rawSourceUrl, { allowHttp });
      } catch (e) {
        if (e instanceof SsrfError) return invalidUrl('sourceUrl', e.message);
        throw e;
      }
    }

    // 回数制限（管理者は対象外）
    if (!isAdmin) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const limit = await consumeRateLimit(supabaseAdmin, auth.user.id, 'analyze-item-image', USER_LIMITS);
      if (!limit.ok) return rateLimitExceededResponse(corsHeaders, limit);
    }

    console.log('Analyzing image:', rawImageUrl.startsWith('data:') ? '(data url)' : rawImageUrl, 'provider:', currentAiProvider());
    if (sourceUrl) console.log('Source URL:', sourceUrl.href);

    // 画像は必ずここで data URL にしてから AI に渡す（内部アドレス・大きすぎる画像はここで止まる）
    let imageUrl: string;
    try {
      imageUrl = await toImageDataUrl(rawImageUrl, allowHttp);
    } catch (e) {
      if (e instanceof SsrfError) {
        // 内部アドレス・画像でない・大きすぎる → 400。取得できなかった（相手の都合）→ 502
        if (e.status === 400 || e.status === 413) return invalidUrl('imageUrl', e.message);
        return jsonResponse(corsHeaders, { error: 'image_fetch_failed', message: e.message }, 502);
      }
      if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        return jsonResponse(corsHeaders, { error: 'image_fetch_failed', message: 'Timed out fetching the image' }, 502);
      }
      throw e;
    }

    // URLからページ情報を取得（ある場合）
    let pageContext = '';
    if (sourceUrl) {
      try {
        pageContext = await fetchPageContext(sourceUrl, allowHttp);
        if (pageContext) console.log('Page context extracted:', pageContext.substring(0, 200));
      } catch (error) {
        // 名前を引くと内部アドレスだった・リダイレクト先が内部だった → 400（取りに行かない）
        if (error instanceof SsrfError && error.status === 400) return invalidUrl('sourceUrl', error.message);
        console.error('Error fetching page:', error instanceof Error ? error.message : error);
        // ページ取得に失敗しても処理は続行
      }
    }

    const response = await callAi({
      jsonOutput: true,
      messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `この画像はアニメグッズやキャラクターグッズの商品画像です。${pageContext ? '\n\nまた、この商品が掲載されているページの情報も提供します：\n' + pageContext + '\n' : ''}

画像${pageContext ? 'とページ情報' : ''}を分析して以下の情報を推測してください：

1. 商品タイトル（具体的な商品名）
2. 商品説明（簡潔な説明）
3. 推定価格（日本円で、一般的な相場から推測${pageContext ? '。ページに価格情報があればそれを優先' : ''}）
4. カテゴリ（例：フィギュア、ぬいぐるみ、アクリルスタンド、缶バッジ、キーホルダー、タペストリー、クリアファイル、Tシャツ、その他）
5. 作品名・コンテンツ名（${pageContext ? 'ページタイトルやURLから作品名を特定してください。' : ''}もし分かれば）
6. キャラクター名（もし分かれば）

${pageContext ? '**重要**: ページ情報から作品名やシリーズ名を積極的に推測してください。アニメ、ゲーム、漫画などの作品名がURLやページタイトルに含まれている可能性があります。\n' : ''}

JSON形式で以下のように回答してください：
{
  "title": "商品タイトル",
  "description": "商品説明",
  "price": "価格（数字のみ）",
  "category": "カテゴリ",
  "contentName": "作品名",
  "characterName": "キャラクター名"
}

不明な項目は空文字列 "" にしてください。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
      ],
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status, response.errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'レート制限に達しました。しばらく待ってから再試行してください。' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: '利用可能なクレジットがありません。ワークスペースにクレジットを追加してください。' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const content = response.text;
    if (!content) {
      throw new Error('AIからの応答が空です');
    }

    const analysisResult = JSON.parse(content);
    console.log('Analysis result:', analysisResult);

    return jsonResponse(corsHeaders, analysisResult);

  } catch (error) {
    console.error('Error in analyze-item-image function:', error);
    // AI に渡す前の画像の検査（_shared/ai.ts）で止まった
    if (error instanceof SsrfError) return invalidUrl('imageUrl', error.message);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '画像の分析中にエラーが発生しました' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
