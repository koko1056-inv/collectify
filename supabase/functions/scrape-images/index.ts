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
    const imgRegex = /<img[^>]*>/gi
    const matches = [...html.matchAll(imgRegex)]
    
    interface ImageData {
      url: string;
      title: string | null;
      price: string | null;
    }
    
    const imageData: ImageData[] = matches.map(match => {
      const imgTag = match[0]
      
      // Extract image URL
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
      let imgUrl = srcMatch ? srcMatch[1] : ''
      
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
      
      // Extract title from alt or title attribute
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i)
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/i)
      const title = altMatch?.[1] || titleMatch?.[1] || null
      
      // Try to extract price from nearby text
      // Look for common price patterns near the image tag
      const imgIndex = html.indexOf(match[0])
      const contextRange = 500 // characters before and after image tag
      const contextStart = Math.max(0, imgIndex - contextRange)
      const contextEnd = Math.min(html.length, imgIndex + match[0].length + contextRange)
      const context = html.slice(contextStart, contextEnd)
      
      // Extract price patterns: ¥1,000, $10.00, etc.
      const pricePatterns = [
        /[¥￥]\s?[\d,]+(?:\.\d+)?(?:\s?\([^)]+\))?/,
        /[\d,]+\s?円(?:\s?\([^)]+\))?/,
        /\$\s?[\d,]+(?:\.\d+)?/,
        /価格[：:]\s?[¥￥\$]?\s?[\d,]+/
      ]
      
      let price = null
      for (const pattern of pricePatterns) {
        const match = context.match(pattern)
        if (match) {
          price = match[0].trim()
          break
        }
      }
      
      return { url: imgUrl, title, price }
    })

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
        title: data.title,
        price: data.price
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
          title: data.title,
          price: data.price
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