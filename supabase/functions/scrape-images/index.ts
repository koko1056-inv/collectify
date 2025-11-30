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
          const urlObj = new URL(url)
          imgUrl = urlObj.origin + imgUrl
        } else if (!imgUrl.startsWith('http')) {
          const urlObj = new URL(url)
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