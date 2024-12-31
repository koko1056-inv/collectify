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

    // Extract image URLs using regex
    const imgRegex = /<img[^>]+src="([^">]+)"/g
    const matches = [...html.matchAll(imgRegex)]
    const imageUrls = matches.map(match => {
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
      return imgUrl
    })

    // Filter out duplicates and invalid URLs
    const uniqueImageUrls = [...new Set(imageUrls)].filter(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp)/i)
    )

    // Store the scraped images in the database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const scrapedImages = uniqueImageUrls.map(imageUrl => ({
      url: imageUrl,
      source_url: url
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

    return new Response(
      JSON.stringify({ images: uniqueImageUrls }),
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