import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { checkRateLimit, corsHeadersFor, isAdminUser, jsonResponse, rateLimitedResponse, readJson, requireUser } from '../_shared/security.ts'
import { consumeRateLimit, rateLimitExceededResponse } from '../_shared/rate-limit.ts'
import { mediaType, parsePublicHttpsUrl, readBodyCapped, safeFetch, SsrfError } from '../_shared/ssrf.ts'
import { cleanText, extractMetaImages, extractPageTitle, toAbsoluteHttpUrl } from '../_shared/html-meta.ts'

// 取得する HTML の上限（先頭1MBだけ読む。超えた分は打ち切り）
const MAX_HTML_BYTES = 1_000_000

// 返す画像の上限（代表画像 og:image が先頭。ページによっては数百枚あるので切る）
const MAX_IMAGES = 60

// ログインしている人なら誰でも使える。一般の人はユーザーごとに 1時間20回・1日100回まで（DB で数える）。
// 管理者（カタログ整備の一括登録）はこの上限の対象外。
const USER_LIMITS = { hour: 20, day: 100 }

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 認証チェック: auth.getUser() で本物のログインユーザーか確かめる
  // （Authorization ヘッダがあるだけ・anon キーだけでは通さない → 401）
  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const body = await readJson(req)
    const rawUrl = body?.url

    if (!rawUrl) {
      return jsonResponse(corsHeaders, { error: 'URL is required' }, 400)
    }

    // SSRF対策: https のみ・IP 直指定や内部ホスト名は拒否（DNS の検査は safeFetch が行う）
    let parsedUrl: URL
    try {
      parsedUrl = parsePublicHttpsUrl(rawUrl)
    } catch (e) {
      if (e instanceof SsrfError) return jsonResponse(corsHeaders, { error: e.message }, 400)
      throw e
    }

    const url = parsedUrl.href // 以降（保存する source_url を含む）は検査済みの URL を使う

    // 連打よけ（インスタンス単位・管理者も含む）
    const burst = checkRateLimit(`scrape-images:${auth.user.id}`, 60, 10 * 60 * 1000)
    if (!burst.ok) return rateLimitedResponse(corsHeaders, burst.retryAfterSec)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const isAdmin = await isAdminUser(auth)
    if (!isAdmin) {
      const limit = await consumeRateLimit(supabase, auth.user.id, 'scrape-images', USER_LIMITS)
      if (!limit.ok) return rateLimitExceededResponse(corsHeaders, limit)
    }

    // Fetch the webpage content with timeout.
    // リダイレクトは最大3回まで辿り、ホップごとに内部アドレスでないか検査し直す。
    const { response, finalUrl } = await safeFetch(parsedUrl, { timeoutMs: 10000, maxRedirects: 3 })

    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      return jsonResponse(corsHeaders, { error: 'Failed to fetch the page' }, 502)
    }
    const type = mediaType(response)
    if (type !== 'text/html' && type !== 'application/xhtml+xml') {
      await response.body?.cancel().catch(() => {})
      return jsonResponse(corsHeaders, { error: 'URL does not point to an HTML page' }, 400)
    }

    // Limit HTML size to prevent memory issues (first 1MB)。ストリームで読んで上限で打ち切る
    const html = new TextDecoder().decode(
      await readBodyCapped(response, MAX_HTML_BYTES, { truncate: true })
    )

    // ページの名前（og:title → twitter:title → <title>）。プレビューの名前の初期値になる
    const pageTitle = extractPageTitle(html)

    interface ImageData {
      url: string;
      title: string | null;
    }

    const imageData: ImageData[] = []
    const seenUrls = new Set<string>()

    // Helper function to check if URL is likely an image
    const isLikelyImageUrl = (url: string): boolean => {
      // Check for common image extensions or image-related patterns
      return url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i) !== null ||
             url.includes('/image/') ||
             url.includes('/img/') ||
             url.includes('/photo/') ||
             url.includes('image') ||
             url.match(/\?.*format=(jpg|jpeg|png|webp|gif)/i) !== null
    }

    // Helper function to add image URL
    // trusted: og:image などページ自身が「代表画像」と言っているもの。拡張子の見た目で落とさない
    const addImageUrl = (rawUrl: string, title: string | null = null, trusted = false) => {
      if (imageData.length >= MAX_IMAGES) return

      // 相対 URL はリダイレクト後のページの URL を基準に絶対 URL にする（data: などは落とす）
      const imgUrl = toAbsoluteHttpUrl(rawUrl, finalUrl)
      if (!imgUrl) return

      // Skip duplicates
      if (seenUrls.has(imgUrl)) return

      // Only add if it's likely an image URL
      if (trusted || isLikelyImageUrl(imgUrl)) {
        seenUrls.add(imgUrl)
        imageData.push({ url: imgUrl, title: title ? cleanText(title) || null : null })
      }
    }

    // 0. 代表画像（og:image → twitter:image）を先頭に。名前はページの名前を付けておく
    for (const ogUrl of extractMetaImages(html, finalUrl)) {
      addImageUrl(ogUrl, pageTitle, true)
    }

    // 1. Extract from img tags (src attribute)
    const imgSrcRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match
    while ((match = imgSrcRegex.exec(html)) !== null) {
      const imgTag = match[0]
      const imgUrl = match[1]

      // Extract title from alt or title attribute
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/)
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/)
      const title = altMatch?.[1] || titleMatch?.[1] || null

      addImageUrl(imgUrl, title)
    }

    // 2. Extract from img tags (data-src attribute for lazy loading)
    const imgDataSrcRegex = /<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi
    while ((match = imgDataSrcRegex.exec(html)) !== null) {
      const imgTag = match[0]
      const imgUrl = match[1]

      const altMatch = imgTag.match(/alt=["']([^"']+)["']/)
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/)
      const title = altMatch?.[1] || titleMatch?.[1] || null

      addImageUrl(imgUrl, title)
    }

    // 3. Extract from srcset attribute
    const srcsetRegex = /srcset=["']([^"']+)["']/gi
    while ((match = srcsetRegex.exec(html)) !== null) {
      const srcsetValue = match[1]
      // Parse srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
      const urls = srcsetValue.split(',').map(s => s.trim().split(/\s+/)[0])
      urls.forEach(imgUrl => addImageUrl(imgUrl))
    }

    // 4. Extract from picture/source elements
    const pictureSourceRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi
    while ((match = pictureSourceRegex.exec(html)) !== null) {
      const srcsetValue = match[1]
      const urls = srcsetValue.split(',').map(s => s.trim().split(/\s+/)[0])
      urls.forEach(imgUrl => addImageUrl(imgUrl))
    }

    // 5. Extract from CSS background-image in style attributes
    const bgImageRegex = /style=["'][^"']*background-image:\s*url\(["']?([^"')]+)["']?\)/gi
    while ((match = bgImageRegex.exec(html)) !== null) {
      addImageUrl(match[1])
    }

    console.log(`Found ${imageData.length} unique images`)

    // scraped_images への保存は管理者（カタログ整備）のときだけ。
    // 一般の人の呼び出しでは書き込まず、結果を返すだけにする（表を誰でも増やせないように）。
    if (isAdmin) {
      // First, clear existing entries for this source URL
      const { error: deleteError } = await supabase
        .from('scraped_images')
        .delete()
        .eq('source_url', url)

      if (deleteError) {
        console.error('Error deleting existing scraped images:', deleteError)
      }

      // Then insert new entries
      if (imageData.length > 0) {
        const scrapedImages = imageData.map(data => ({
          url: data.url,
          source_url: url,
          title: data.title
        }))

        const { error: insertError } = await supabase
          .from('scraped_images')
          .insert(scrapedImages)

        if (insertError) {
          console.error('Error inserting scraped images:', insertError)
          return jsonResponse(corsHeaders, { error: 'Failed to store scraped images' }, 500)
        }
      }
    }

    return jsonResponse(corsHeaders, {
      // ページの名前（無ければ null）
      title: pageTitle,
      // リダイレクトを辿った後のページの URL
      finalUrl: finalUrl.href,
      // 以前からの形（BulkImportModal などが使う）。先頭は og:image
      images: imageData.map(data => ({
        url: data.url,
        title: data.title
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    // 取得先の内部事情は返さず、SSRF 対策で弾いた場合だけ固定の文言を返す
    if (error instanceof SsrfError) {
      return jsonResponse(corsHeaders, { error: error.message }, error.status)
    }
    return jsonResponse(corsHeaders, { error: 'Failed to scrape images' }, 500)
  }
})
