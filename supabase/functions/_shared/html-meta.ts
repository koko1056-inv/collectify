// 取得した HTML から、ページの名前と代表画像を取り出す
//
// scrape-images（URL を貼って追加）と analyze-item-image（ページの情報を AI に渡す）で使う。
// DOM パーサーは使わず、<meta> と <title> だけを正規表現で読む（先頭 1MB の HTML が対象）。
// Deno 固有の API は使わないので、Node / bun からも読み込める（scripts/test-html-meta.mjs）。

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** よく出る HTML の文字参照（&amp; &#39; &#x2F; など）を元の文字に戻す。 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (whole, ref: string) => {
    const lower = ref.toLowerCase();
    if (lower.startsWith("#x") || lower.startsWith("#")) {
      const code = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      if (code >= 0xd800 && code <= 0xdfff) return whole;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[lower] ?? whole;
  });
}

/** 文字参照を戻し、空白（改行・連続スペース）を1つにまとめて前後を落とす。 */
export function cleanText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

/** タグの中の属性を { 名前(小文字): 値 } にする。値の文字参照はまだ戻さない。 */
function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/**
 * <meta property|name="key" content="..."> の content を、HTML に出てくる順にすべて返す。
 * 属性の順番（content が先でも）・引用符の種類は問わない。key は大文字小文字を区別しない。
 */
export function extractMetaContents(html: string, key: string): string[] {
  const want = key.toLowerCase();
  const out: string[] = [];
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = parseAttributes(m[0]);
    const k = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    if (k !== want || attrs.content === undefined) continue;
    const value = cleanText(attrs.content);
    if (value) out.push(value);
  }
  return out;
}

/** 最初に見つかった <meta> の content。無ければ null。 */
export function extractMetaContent(html: string, key: string): string | null {
  return extractMetaContents(html, key)[0] ?? null;
}

/** 名前として長すぎるものは切る（ページによっては説明文まるごとが入っている） */
const MAX_TITLE_LENGTH = 200;

/**
 * ページの名前。og:title → twitter:title → <title> の順に、最初に中身があるもの。
 * 文字参照を戻して空白を詰める。見つからなければ null。
 */
export function extractPageTitle(html: string): string | null {
  const candidates = [
    extractMetaContent(html, "og:title"),
    extractMetaContent(html, "twitter:title"),
    (() => {
      const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      return m ? cleanText(m[1]) : null;
    })(),
  ];
  const title = candidates.find((c): c is string => !!c);
  if (!title) return null;
  return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH).trimEnd() : title;
}

/** ページの説明。og:description → description → twitter:description。 */
export function extractPageDescription(html: string): string | null {
  return (
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "twitter:description")
  );
}

/**
 * 代表画像（og:image 系 → twitter:image 系）の URL を、絶対 URL にして重複を除いて返す。
 * http(s) 以外（data: など）と、URL として読めないものは落とす。
 */
export function extractMetaImages(html: string, baseUrl: URL | string): string[] {
  const keys = ["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    for (const raw of extractMetaContents(html, key)) {
      const abs = toAbsoluteHttpUrl(raw, baseUrl);
      if (abs && !seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    }
  }
  return out;
}

/** 相対 URL（//cdn…、/img/…、img/…）をページの URL を基準に絶対 URL にする。http(s) 以外は null。 */
export function toAbsoluteHttpUrl(raw: string, baseUrl: URL | string): string | null {
  const value = decodeHtmlEntities(raw).trim();
  if (!value || value.startsWith("data:")) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
