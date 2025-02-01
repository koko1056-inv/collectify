import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { url } = await req.json()
    
    // Fetch the image
    const imageResponse = await fetch(url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    // Convert to blob and then to base64
    const imageBlob = await imageResponse.blob()
    const buffer = await imageBlob.arrayBuffer()
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(buffer))
    )

    return new Response(
      JSON.stringify({ 
        imageBlob: base64
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      },
    )
  }
})