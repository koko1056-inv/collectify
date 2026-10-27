// supabase/functions/_shared/html-meta.ts の振る舞いテスト
//
//   node --experimental-strip-types scripts/test-html-meta.mjs
//   （Node 20 など、このフラグが無いときは bun scripts/test-html-meta.mjs）
//
// html-meta.ts は Deno 固有の API を使わないので、そのまま読み込んで検証する。

import {
  decodeHtmlEntities,
  extractMetaContent,
  extractMetaImages,
  extractPageDescription,
  extractPageTitle,
  toAbsoluteHttpUrl,
} from "../supabase/functions/_shared/html-meta.ts";

let failed = 0;
function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(actual)} (期待: ${JSON.stringify(expected)})`}`);
}

// ── 文字参照 ──
eq("&amp; &lt; &gt; &quot;", decodeHtmlEntities("A &amp; B &lt;C&gt; &quot;D&quot;"), 'A & B <C> "D"');
eq("数値参照（10進・16進）", decodeHtmlEntities("&#39;x&#x27; &#12354;"), "'x' あ");
eq("知らない参照はそのまま", decodeHtmlEntities("&unknown; &#xD800;"), "&unknown; &#xD800;");

// ── ページの名前 ──
eq(
  "og:title を優先",
  extractPageTitle(`<title>サイト名</title><meta property="og:title" content="アクスタ 推し &amp; 仲間">`),
  "アクスタ 推し & 仲間"
);
eq(
  "content が先・単引用符でも読む",
  extractPageTitle(`<meta content='缶バッジ（全10種）' property='og:title' />`),
  "缶バッジ（全10種）"
);
eq(
  "og:title が無ければ twitter:title",
  extractPageTitle(`<meta name="twitter:title" content="  ぬいぐるみ  "><title>x</title>`),
  "ぬいぐるみ"
);
eq(
  "どちらも無ければ <title>（改行・空白を詰める）",
  extractPageTitle(`<head><title>\n  公式ショップ |\n  キーホルダー  </title></head>`),
  "公式ショップ | キーホルダー"
);
eq("空の og:title は飛ばす", extractPageTitle(`<meta property="og:title" content=" "><title>T</title>`), "T");
eq("何も無ければ null", extractPageTitle(`<p>no title</p>`), null);
eq("長すぎる名前は 200 文字で切る", extractPageTitle(`<title>${"あ".repeat(300)}</title>`)?.length, 200);
eq("大文字のタグ・属性", extractMetaContent(`<META PROPERTY="OG:TITLE" CONTENT="X">`, "og:title"), "X");

// ── 説明 ──
eq(
  "og:description → description",
  extractPageDescription(`<meta name="description" content="説明"><meta property="og:description" content="OG説明">`),
  "OG説明"
);

// ── 代表画像 ──
const base = new URL("https://shop.example.com/items/123?ref=x");
eq(
  "og:image を絶対 URL にして重複を除く（secure_url が先）",
  extractMetaImages(
    `<meta property="og:image" content="/img/a.jpg?w=1&amp;h=2">
     <meta property="og:image:secure_url" content="https://cdn.example.com/a.jpg">
     <meta property="og:image" content="https://cdn.example.com/a.jpg">
     <meta name="twitter:image" content="//cdn.example.com/t.png">
     <meta property="og:image" content="data:image/png;base64,AAAA">`,
    base
  ),
  ["https://cdn.example.com/a.jpg", "https://shop.example.com/img/a.jpg?w=1&h=2", "https://cdn.example.com/t.png"]
);

// ── 相対 URL ──
eq("相対パスはページの位置を基準に", toAbsoluteHttpUrl("b.png", base), "https://shop.example.com/items/b.png");
eq("// はページのスキーム", toAbsoluteHttpUrl("//cdn.example.com/x.png", base), "https://cdn.example.com/x.png");
eq("# は落とす", toAbsoluteHttpUrl("/x.png#frag", base), "https://shop.example.com/x.png");
eq("javascript: は null", toAbsoluteHttpUrl("javascript:alert(1)", base), null);
eq("data: は null", toAbsoluteHttpUrl("data:image/png;base64,AA", base), null);

console.log(failed ? `\n${failed} 件失敗` : "\nすべて通過");
if (failed) process.exit(1);
