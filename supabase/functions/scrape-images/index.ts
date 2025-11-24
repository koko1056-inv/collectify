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

    // Fetch the webpage content with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    let html = await response.text()
    
    // Limit HTML size to prevent memory issues (first 1MB)
    if (html.length > 1000000) {
      html = html.substring(0, 1000000)
    }

    interface ImageData {
      url: string;
      title: string | null;
    }
    
    const imageData: ImageData[] = []
    const seenUrls = new Set<string>()
    
    // Simple img tag extraction with alt/title attributes
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const matches = html.match(imgRegex) || []
    
    // Limit to first 100 images to prevent resource exhaustion
    const limitedMatches = matches.slice(0, 100)
    
    for (const imgTag of limitedMatches) {
      // Extract src
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/)
      if (!srcMatch) continue
      
      let imgUrl = srcMatch[1]
      
      // Skip data URLs and non-image files
      if (imgUrl.startsWith('data:') || !imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
        continue
      }
      
      // Handle relative URLs
      try {
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + imgUrl
        } else if (!imgUrl.startsWith('http')) {
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + '/' + imgUrl
        }
      } catch (e) {
        console.error('Invalid URL:', imgUrl)
        continue
      }
      
      // Skip duplicates
      if (seenUrls.has(imgUrl)) continue
      seenUrls.add(imgUrl)
      
      // Extract title from alt or title attribute
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/)
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/)
      const title = altMatch?.[1] || titleMatch?.[1] || null
      
      imageData.push({ url: imgUrl, title })
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
        return new Response(
          JSON.stringify({ error: 'Failed to store scraped images' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        images: imageData.map(data => ({
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