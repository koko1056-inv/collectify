import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch the webpage content
    const response = await fetch(url)
    const html = await response.text()

    // Extract images with their metadata
    interface ImageData {
      url: string;
      title: string | null;
    }
    
    // より高度なHTMLパーシングで商品名を抽出
    const imageData: ImageData[] = []
    
    // 画像を含む商品コンテナを探す（一般的なパターン）
    const productPatterns = [
      /<(?:div|li|article)[^>]*class="[^"]*(?:product|item|goods)[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<[^>]*>([^<]+)<\/[^>]+>[\s\S]*?<\/(?:div|li|article)>/gi,
      /<(?:div|li)[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<(?:h[1-6]|p|span|div)[^>]*class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]+)</gi,
      /<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/gi,
    ]
    
    // 各パターンを試す
    for (const pattern of productPatterns) {
      const matches = [...html.matchAll(pattern)]
      for (const match of matches) {
        let imgUrl = match[1]
        let title = match[2]?.trim() || null
        
        // Handle relative URLs
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + imgUrl
        } else if (!imgUrl.startsWith('http')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + '/' + imgUrl
        }
        
        // 重複チェック
        const exists = imageData.find(item => item.url === imgUrl)
        if (!exists && imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
          imageData.push({ url: imgUrl, title })
        }
      }
    }
    
    // パターンマッチングで取得できなかった場合、個別に画像とその周辺のテキストを抽出
    if (imageData.length === 0) {
      const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi
      const imgMatches = [...html.matchAll(imgRegex)]
      
      for (const match of imgMatches) {
        let imgUrl = match[1]
        
        // Handle relative URLs
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + imgUrl
        } else if (!imgUrl.startsWith('http')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + '/' + imgUrl
        }
        
        if (!imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) continue
        
        // 画像タグのalt属性から取得
        const altMatch = match[0].match(/alt="([^"]+)"/i)
        const titleMatch = match[0].match(/title="([^"]+)"/i)
        let title = altMatch?.[1] || titleMatch?.[1] || null
        
        // alt/titleがない場合、画像の前後のテキストを探す
        if (!title) {
          const imgIndex = html.indexOf(match[0])
          const contextRange = 300
          const contextStart = Math.max(0, imgIndex - contextRange)
          const contextEnd = Math.min(html.length, imgIndex + match[0].length + contextRange)
          const context = html.slice(contextStart, contextEnd)
          
          // 商品名らしいテキストを抽出（タグに囲まれたテキスト）
          const textPatterns = [
            /<(?:h[1-6]|p|span|div)[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([^<]{3,50})</i,
            /<(?:h[1-6])[^>]*>([^<]{3,50})</i,
          ]
          
          for (const textPattern of textPatterns) {
            const textMatch = context.match(textPattern)
            if (textMatch && textMatch[1]) {
              title = textMatch[1].trim()
              break
            }
          }
        }
        
        imageData.push({ url: imgUrl, title })
      }
    }
    
    // Filter out duplicates and invalid URLs
    const uniqueImageData = imageData.filter((data, index, self) => 
      data.url.match(/\.(jpg|jpeg|png|gif|webp)/i) &&
      self.findIndex(d => d.url === data.url) === index
    )

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
    if (uniqueImageData.length > 0) {
      const scrapedImages = uniqueImageData.map(data => ({
        url: data.url,
        source_url: url,
        title: data.title
      }))

      const { error: insertError } = await supabase
        .from('scraped_images')
        .insert(scrapedImages)

      if (insertError) {
        console.error('Error inserting scraped images:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to store scraped images' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        images: uniqueImageData.map(data => ({
          url: data.url,
          title: data.title
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to scrape images' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})