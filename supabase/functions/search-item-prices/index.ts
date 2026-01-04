import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  shop: string;
  shopIcon: string;
  title: string;
  price: string;
  url: string;
  image?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemTitle } = await req.json();

    if (!itemTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Item title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for item prices:', itemTitle);

    // Search across multiple platforms
    const searchQueries = [
      { shop: 'メルカリ', query: `${itemTitle} site:mercari.com`, icon: '🛒' },
      { shop: 'Amazon', query: `${itemTitle} site:amazon.co.jp`, icon: '📦' },
      { shop: 'eBay', query: `${itemTitle} site:ebay.com`, icon: '🌐' },
      { shop: '楽天', query: `${itemTitle} site:rakuten.co.jp`, icon: '🏪' },
      { shop: 'ヤフオク', query: `${itemTitle} site:auctions.yahoo.co.jp`, icon: '🔨' },
    ];

    const results: SearchResult[] = [];

    // Search all shops in parallel
    const searchPromises = searchQueries.map(async ({ shop, query, icon }) => {
      try {
        console.log(`Searching ${shop}:`, query);
        
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 3,
          }),
        });

        if (!response.ok) {
          console.error(`${shop} search failed:`, response.status);
          return [];
        }

        const data = await response.json();
        console.log(`${shop} search returned:`, data.data?.length || 0, 'results');

        if (data.success && data.data) {
          return data.data.map((item: any) => ({
            shop,
            shopIcon: icon,
            title: item.title || 'タイトル不明',
            price: extractPrice(item.description || item.markdown || ''),
            url: item.url,
            image: item.image,
          }));
        }
        return [];
      } catch (error) {
        console.error(`${shop} search error:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach(shopResults => results.push(...shopResults));

    console.log('Total results found:', results.length);

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching item prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search prices';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractPrice(text: string): string {
  // Try to extract Japanese yen prices
  const yenMatch = text.match(/[¥￥][\d,]+|[\d,]+円/);
  if (yenMatch) {
    return yenMatch[0];
  }
  
  // Try to extract USD prices
  const usdMatch = text.match(/\$[\d,.]+/);
  if (usdMatch) {
    return usdMatch[0];
  }
  
  // Try to extract any number that looks like a price
  const numberMatch = text.match(/[\d,]+(?:\.\d{2})?/);
  if (numberMatch && parseInt(numberMatch[0].replace(/,/g, '')) > 100) {
    return `¥${numberMatch[0]}`;
  }
  
  return '価格不明';
}
