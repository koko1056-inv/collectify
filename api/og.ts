/**
 * SNS・検索エンジン向けのリンクプレビュー(OGP)を返す Vercel Function。
 *
 * なぜ Supabase の Edge Function ではなくここで返すのか:
 *  Supabase の既定ドメインは HTML を `text/plain` に書き換えて返すため、
 *  X や LINE はメタタグを読めず、人がURLを開いてもHTMLのソースが表示されていた。
 *  Vercel 側なら本来の `text/html` で返せる。
 *
 *  - type=item : グッズ。公開済みの official_items を直接読んで描く
 *  - それ以外  : 既存の Edge Function(og-image) が組み立てたHTMLを、正しい Content-Type で中継する
 *
 * 人間のアクセスは本来のページへ送り返す。クローラーにはメタタグ入りのHTMLをそのまま返す。
 */

const SUPABASE_URL = "https://dmgrgzysrzzgsajwqyrh.supabase.co";
// 公開用の anon キー（フロントに埋め込まれているものと同じ。RLS で公開された行だけ読める）
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MTExODUsImV4cCI6MjA1MDE4NzE4NX0.UsoRjDcgPGmEqmYetdsvH9bk-Zj9-dFz7YuonnF2WT4";

const BOT_RE = /bot|crawler|spider|facebookexternalhit|line-poker|whatsapp|telegram|slurp|preview/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE_TYPES = new Set(["room", "user", "post", "display"]);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function rest(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as any[];
}

function originOf(req: any): string {
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string) || "collectify-main.vercel.app";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  return `${proto.split(",")[0]}://${host.split(",")[0]}`;
}

async function loadItem(id: string) {
  const sel = "id,title,image,content_name,description,release_date,price,merged_into";
  let rows = await rest(`official_items?id=eq.${id}&select=${sel}&limit=1`);
  let item = rows[0];
  // 重複として統合されたグッズは、統合先のページを案内する
  if (item?.merged_into) {
    rows = await rest(`official_items?id=eq.${item.merged_into}&select=${sel}&limit=1`);
    item = rows[0] ?? item;
  }
  return item as
    | { id: string; title: string; image: string | null; content_name: string | null; description: string | null; release_date: string | null; price: string | null }
    | undefined;
}

function itemHtml(origin: string, item: NonNullable<Awaited<ReturnType<typeof loadItem>>>, isBot: boolean) {
  const pageUrl = `${origin}/item/${item.id}`;
  const series = item.content_name ? `${item.content_name}の` : "";
  const title = `${item.title}｜${item.content_name ?? "グッズ"} | Collectify`;
  const description =
    `${series}グッズ「${item.title}」。持っている人・交換できる人がわかる、推しグッズ管理アプリ Collectify。` +
    (item.release_date ? ` 発売日: ${item.release_date}。` : "");
  const image = item.image || `${origin}/og-image.png`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    image: [image],
    description: item.description || description,
    ...(item.content_name ? { brand: { "@type": "Brand", name: item.content_name } } : {}),
    url: pageUrl,
  };
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(pageUrl)}" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:site_name" content="Collectify" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  ${isBot ? "" : `<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />`}
</head>
<body>
  <h1>${esc(item.title)}</h1>
  ${item.content_name ? `<p>${esc(item.content_name)}</p>` : ""}
  <p><a href="${esc(pageUrl)}">Collectifyで見る</a></p>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, "https://placeholder.local");
  const type = url.searchParams.get("type") || "item";
  const id = url.searchParams.get("id") || "";
  const ua = String(req.headers["user-agent"] || "");
  const isBot = BOT_RE.test(ua);
  const origin = originOf(req);

  try {
    if (type === "item") {
      if (!UUID_RE.test(id)) {
        res.statusCode = 404;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
      }
      const item = await loadItem(id);
      if (!item) {
        // 見つからないときもアプリ本体に任せる（人間はアプリ側の表示を見る）
        res.statusCode = isBot ? 404 : 302;
        if (!isBot) res.setHeader("location", `/item/${id}`);
        res.end();
        return;
      }
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=86400");
      res.end(itemHtml(origin, item, isBot));
      return;
    }

    if (SHARE_TYPES.has(type) && id) {
      const upstream = await fetch(
        `${SUPABASE_URL}/functions/v1/og-image?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,
        { headers: { "user-agent": ua } }
      );
      const body = await upstream.text();
      res.statusCode = upstream.ok ? 200 : 502;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=86400");
      res.end(body);
      return;
    }

    res.statusCode = 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Bad request");
  } catch {
    res.statusCode = 302;
    res.setHeader("location", "/");
    res.end();
  }
}
