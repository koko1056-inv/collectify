import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  corsHeadersFor,
  jsonResponse,
  rateLimitedResponse,
  readJson,
  requireUser,
} from "../_shared/security.ts";

// 検索語の上限
const MAX_TITLE_CHARS = 200;

interface SearchResult {
  shop: string;
  shopIcon: string;
  title: string;
  price: string;
  url: string;
  image?: string;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ログイン必須（anon キーだけの呼び出しは 401）
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body = await readJson(req);
    const itemTitle = typeof body?.itemTitle === 'string' ? body.itemTitle.trim() : '';

    if (!itemTitle) {
      return jsonResponse(corsHeaders, { success: false, error: 'Item title is required' }, 400);
    }
    if (itemTitle.length > MAX_TITLE_CHARS) {
      return jsonResponse(corsHeaders, { success: false, error: 'Item title is too long' }, 400);
    }

    // 1回の検索で Firecrawl を5回呼ぶので 10分に10回まで
    // TODO: 暫定のインスタンス単位の制限。共有ストアでの制限に置き換えること（_shared/security.ts 参照）
    const limit = checkRateLimit(`search-item-prices:${auth.user.id}`, 10, 10 * 60 * 1000);
    if (!limit.ok) return rateLimitedResponse(corsHeaders, limit.retryAfterSec);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return jsonResponse(corsHeaders, { success: false, error: 'Firecrawl connector not configured' }, 500);
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
            scrapeOptions: {
              formats: ['markdown', 'links'],
            },
          }),
        });

        if (!response.ok) {
          console.error(`${shop} search failed:`, response.status);
          return [];
        }

        const data = await response.json();
        console.log(`${shop} search returned:`, data.data?.length || 0, 'results');

        if (data.success && data.data) {
          return data.data.map((item: any) => {
            // Try to extract image from metadata, og:image, or markdown content
            let image = item.metadata?.ogImage || 
                       item.metadata?.image || 
                       item.image ||
                       extractImageFromMarkdown(item.markdown || '');
            
            return {
              shop,
              shopIcon: icon,
              title: item.title || item.metadata?.title || 'タイトル不明',
              price: extractPrice(item.description || item.markdown || ''),
              url: item.url,
              image,
            };
          });
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

    return jsonResponse(corsHeaders, { success: true, data: results });
  } catch (error) {
    console.error('Error searching item prices:', error);
    // 内部のエラー文言はクライアントに返さない
    return jsonResponse(corsHeaders, { success: false, error: 'Failed to search prices' }, 500);
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

function extractImageFromMarkdown(markdown: string): string | undefined {
  // Extract first image URL from markdown ![alt](url) or <img src="url">
  const mdImageMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (mdImageMatch) {
    return mdImageMatch[1];
  }
  
  const imgTagMatch = markdown.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgTagMatch) {
    return imgTagMatch[1];
  }
  
  // Look for common image URLs in the text
  const imageUrlMatch = markdown.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif))/i);
  if (imageUrlMatch) {
    return imageUrlMatch[1];
  }
  
  return undefined;
}
