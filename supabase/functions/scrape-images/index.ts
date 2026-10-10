import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { checkRateLimit, corsHeadersFor, jsonResponse, rateLimitedResponse, readJson, requireAdmin } from '../_shared/security.ts'
import { mediaType, parsePublicHttpsUrl, readBodyCapped, safeFetch, SsrfError } from '../_shared/ssrf.ts'

// 取得する HTML の上限（先頭1MBだけ読む。超えた分は打ち切り）
const MAX_HTML_BYTES = 1_000_000

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 認証チェック: auth.getUser() で本物のログインユーザーか確かめる
  // （Authorization ヘッダがあるだけでは通さない）
  const auth = await requireAdmin(req, corsHeaders)
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

    // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限に置き換えること（_shared/security.ts 参照）
    const limit = checkRateLimit(`scrape-images:${auth.user.id}`, 60, 10 * 60 * 1000)
    if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec)

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

    interface ImageData {
      url: string;
      title: string | null;
    }
    
    const imageData: ImageData[] = []
    const seenUrls = new Set<string>()
    
    // Helper function to check if URL is likely an image
    const isLikelyImageUrl = (url: string): boolean => {
      if (url.startsWith('data:')) return false
      // Check for common image extensions or image-related patterns
      return url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i) !== null ||
             url.includes('/image/') ||
             url.includes('/img/') ||
             url.includes('/photo/') ||
             url.includes('image') ||
             url.match(/\?.*format=(jpg|jpeg|png|webp|gif)/i) !== null
    }
    
    // Helper function to add image URL
    const addImageUrl = (imgUrl: string, title: string | null = null) => {
      // Skip data URLs
      if (imgUrl.startsWith('data:')) return
      
      // Handle relative URLs
      try {
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl
        } else if (imgUrl.startsWith('/')) {
          const urlObj = finalUrl
          imgUrl = urlObj.origin + imgUrl
        } else if (!imgUrl.startsWith('http')) {
          const urlObj = finalUrl
          imgUrl = urlObj.origin + '/' + imgUrl
        }
      } catch (e) {
        console.error('Invalid URL:', imgUrl)
        return
      }
      
      // Skip duplicates
      if (seenUrls.has(imgUrl)) return
      
      // Only add if it's likely an image URL
      if (isLikelyImageUrl(imgUrl)) {
        seenUrls.add(imgUrl)
        imageData.push({ url: imgUrl, title })
      }
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

    // First, clear existing entries for this source URL
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    return jsonResponse(corsHeaders, {
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