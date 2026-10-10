import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { checkRateLimit, corsHeadersFor, jsonResponse, rateLimitedResponse, readJson, requireUser } from '../_shared/security.ts'

interface VisionAnnotation {
  description: string;
  score: number;
}

interface VisionWebEntity {
  description: string;
  score: number;
}

interface VisionWebImage {
  url: string;
  score?: number;
}

interface VisionWebPage {
  url: string;
  pageTitle?: string;
  fullMatchingImages?: VisionWebImage[];
  partialMatchingImages?: VisionWebImage[];
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 認証チェック: auth.getUser() で本物のログインユーザーか確かめる
  // （Authorization ヘッダがあるだけでは通さない）
  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    if (!apiKey) {
      console.error('GOOGLE_CLOUD_VISION_API_KEY is not configured')
      return jsonResponse(corsHeaders, { error: 'Image analysis is not available' }, 500)
    }

    const body = await readJson(req)
    const imageUrl = body?.imageUrl
    const searchMode = body?.searchMode

    if (!imageUrl || typeof imageUrl !== 'string') {
      return jsonResponse(corsHeaders, { error: 'Image URL is required' }, 400)
    }

    // 入力サイズ制限（Base64で10MB以内）
    if (imageUrl.length > 10 * 1024 * 1024) {
      return jsonResponse(corsHeaders, { error: 'Image data too large (max 10MB)' }, 400)
    }

    // Vision API は有料なので 10分に30回まで
    // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限に置き換えること（_shared/security.ts 参照）
    const limit = checkRateLimit(`analyze-image:${auth.user.id}`, 30, 10 * 60 * 1000)
    if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec)

    console.log('Starting Google Cloud Vision analysis, mode:', typeof searchMode === 'string' ? searchMode.slice(0, 20) : 'all');

    // Base64データからプレフィックスを除去
    let imageContent = imageUrl
    if (imageContent.startsWith('data:')) {
      imageContent = imageContent.split(',')[1]
    }

    // Google Cloud Vision APIリクエスト
    const visionFeatures = [
      { type: 'LABEL_DETECTION', maxResults: 15 },
      { type: 'WEB_DETECTION', maxResults: 20 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
      { type: 'TEXT_DETECTION', maxResults: 5 },
    ]

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageContent },
            features: visionFeatures,
          }],
        }),
      }
    )

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text()
      console.error('Vision API error:', errorData)
      throw new Error(`Vision API error: ${visionResponse.status}`)
    }

    const visionData = await visionResponse.json()
    const annotations = visionData.responses?.[0]

    if (!annotations) {
      throw new Error('No annotations returned from Vision API')
    }

    // ラベル検出結果
    const labels: VisionAnnotation[] = (annotations.labelAnnotations || []).map((l: any) => ({
      description: l.description,
      score: l.score,
    }))

    // オブジェクト検出結果
    const objects = (annotations.localizedObjectAnnotations || []).map((o: any) => ({
      label: o.name,
      score: o.score,
    }))

    // テキスト検出結果
    const detectedTexts = (annotations.textAnnotations || [])
      .slice(0, 3)
      .map((t: any) => t.description)

    // Web検出結果
    const webDetection = annotations.webDetection || {}
    const webEntities: VisionWebEntity[] = (webDetection.webEntities || [])
      .filter((e: any) => e.description && e.score > 0.3)
      .map((e: any) => ({
        description: e.description,
        score: e.score,
      }))

    const bestGuessLabels = (webDetection.bestGuessLabels || [])
      .map((l: any) => l.label)

    // Web上の類似画像
    const visuallySimilarImages: VisionWebImage[] = (webDetection.visuallySimilarImages || [])
      .slice(0, 10)
      .map((img: any) => ({
        url: img.url,
        score: img.score,
      }))

    // Web上で見つかったページ
    const pagesWithMatchingImages: VisionWebPage[] = (webDetection.pagesWithMatchingImages || [])
      .slice(0, 10)
      .map((page: any) => ({
        url: page.url,
        pageTitle: page.pageTitle,
        fullMatchingImages: page.fullMatchingImages?.slice(0, 3),
        partialMatchingImages: page.partialMatchingImages?.slice(0, 3),
      }))

    // キーワードを生成（アプリ内検索用）
    const keywords = [
      ...bestGuessLabels,
      ...webEntities.slice(0, 5).map(e => e.description),
      ...labels.filter(l => l.score > 0.7).map(l => l.description),
      ...objects.filter(o => o.score > 0.5).map(o => o.label),
      ...detectedTexts.slice(0, 2),
    ]
    .filter(Boolean)
    .map(k => k.toLowerCase())
    .filter((k, i, arr) => arr.indexOf(k) === i) // 重複排除

    console.log('Generated keywords:', keywords.slice(0, 10))

    // キャプション生成（ベストゲスラベル + ラベルから）
    const caption = bestGuessLabels.length > 0
      ? bestGuessLabels.join(', ')
      : labels.slice(0, 3).map(l => l.description).join(', ')

    // アプリ内のグッズ検索
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let items: any[] = []
    
    if (keywords.length > 0) {
      // キーワードでOR検索
      // キーワードは外部サービス（Vision API）の出力なので、PostgREST のフィルタ文字列を
      // 壊す文字を落としてから埋め込む
      const searchTerms = keywords
        .slice(0, 8)
        .map(keyword => keyword.replace(/[%*,()\\"'`]/g, ' ').trim())
        .filter(keyword => keyword.length > 0)
      const orConditions = searchTerms
        .map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .join(',')
      
      const { data, error } = searchTerms.length === 0 ? { data: [], error: null } : await supabase
        .from('official_items')
        .select('*')
        .or(orConditions)
        .limit(20)
      
      if (error) {
        console.error('Supabase query error:', error)
      } else {
        items = data || []
      }
    }

    console.log(`Found ${items.length} app items, ${visuallySimilarImages.length} web similar images`)

    return jsonResponse(corsHeaders, {
        detection: {
          objects,
          labels,
          caption,
          detectedTexts,
        },
        webResults: {
          webEntities,
          bestGuessLabels,
          visuallySimilarImages,
          pagesWithMatchingImages,
        },
        keywords,
        items,
    })
  } catch (error) {
    console.error('Error:', error)
    // 内部のエラー文言（details）はクライアントに返さない
    return jsonResponse(corsHeaders, { error: 'An unexpected error occurred' }, 500)
  }
})