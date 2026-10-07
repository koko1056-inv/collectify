/**
 * 検索エンジン向けサイトマップ。グッズの公開ページ(/item/:id)を全件並べる。
 * グッズは日々増えるので、静的ファイルではなくリクエスト時に組み立てる（CDNで10分キャッシュ）。
 */

const SUPABASE_URL = "https://dmgrgzysrzzgsajwqyrh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3Jnenlzcnp6Z3NhandxeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MTExODUsImV4cCI6MjA1MDE4NzE4NX0.UsoRjDcgPGmEqmYetdsvH9bk-Zj9-dFz7YuonnF2WT4";

const PAGE = 1000;

async function fetchItems(): Promise<{ id: string; created_at: string }[]> {
  const all: { id: string; created_at: string }[] = [];
  for (let from = 0; from < 50000; from += PAGE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/official_items?select=id,created_at&merged_into=is.null&order=created_at.desc&limit=${PAGE}&offset=${from}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) break;
    const rows = (await res.json()) as { id: string; created_at: string }[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export default async function handler(req: any, res: any) {
  const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string) || "collectify-main.vercel.app";
  const origin = `https://${host.split(",")[0]}`;
  const items = await fetchItems().catch(() => []);

  const urls = [
    { loc: `${origin}/`, priority: "1.0", lastmod: undefined as string | undefined },
    { loc: `${origin}/login`, priority: "0.6", lastmod: undefined },
    { loc: `${origin}/how-to-use`, priority: "0.5", lastmod: undefined },
    ...items.map((i) => ({ loc: `${origin}/item/${i.id}`, priority: "0.7", lastmod: i.created_at?.slice(0, 10) })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.statusCode = 200;
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=86400");
  res.end(xml);
}
