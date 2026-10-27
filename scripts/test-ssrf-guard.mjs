// supabase/functions/_shared/ssrf.ts の振る舞いテスト
//
//   node --experimental-strip-types scripts/test-ssrf-guard.mjs
//
// このリポジトリには Deno が無いので、ssrf.ts を Node の型除去モードでそのまま読み込み、
// Deno.resolveDns と fetch を差し替えて検証する。
// （ssrf.ts は Deno 固有の API を関数の中でしか触らないので、そのまま読める）

import {
  SsrfError,
  assertPublicHttpsUrl,
  hostMatches,
  isPrivateIPv4,
  isPrivateIPv6,
  parsePublicHttpsUrl,
  readBodyCapped,
  safeFetch,
  sniffImageMediaType,
} from "../supabase/functions/_shared/ssrf.ts";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
}
async function rejects(name, fn, status) {
  try {
    await fn();
    check(name, false, "(拒否されなかった)");
  } catch (e) {
    check(name, e instanceof SsrfError && (status === undefined || e.status === status), String(e));
  }
}

// ── IPv4 ──
for (const ip of [
  "0.0.0.0", "0.1.2.3", "10.0.0.1", "10.255.255.255", "100.64.0.1", "100.127.255.255", "127.0.0.1", "127.1.2.3",
  "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "192.0.0.1", "198.18.0.1", "224.0.0.1",
  "240.0.0.1", "255.255.255.255", "not-an-ip", "1.2.3", "192.88.99.1", "192.0.2.10", "198.51.100.7", "203.0.113.9",
  "1.2.3.256", "",
]) {
  check(`IPv4 ${ip} は内部`, isPrivateIPv4(ip));
}
for (const ip of ["1.1.1.1", "8.8.8.8", "100.63.255.255", "100.128.0.1", "172.15.0.1", "172.32.0.1", "169.253.0.1", "93.184.216.34"]) {
  check(`IPv4 ${ip} は公開`, !isPrivateIPv4(ip));
}

// ── IPv6 ──
for (const ip of [
  "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1",
  "::ffff:10.0.0.1", "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "2002:7f00:1::1", "2001:db8::1",
  "[::1]", "fe80::1%eth0", "0:0:0:0:0:0:0:1", "::127.0.0.1", "garbage:",
  // IPv4 変換（SIIT）・ローカル NAT64・6to4 に埋め込んだ内部 IPv4・Teredo・大文字表記
  "::ffff:0:127.0.0.1", "::ffff:0:7f00:1", "::ffff:0:a9fe:a9fe", "64:ff9b:1::1", "2002:a9fe:a9fe::1", "2002:c0a8:0101::1",
  "2001:0:4136:e378:8000:63bf:3fff:fdd2", "FD00::1", "FE80::ABCD", "fd00:ec2::254", "64:ff9b::a9fe:a9fe",
  "1:2:3:4:5:6:7:8:9", "::1::", "12345::1",
]) {
  check(`IPv6 ${ip} は内部`, isPrivateIPv6(ip));
}
for (const ip of [
  "2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8", "2a00:1450:4001:81b::200e", "::ffff:0:8.8.8.8",
  "64:ff9b::808:808", "2002:0808:0808::1",
]) {
  check(`IPv6 ${ip} は公開`, !isPrivateIPv6(ip));
}

// ── URL の形 ──
const badUrls = [
  "http://example.com/", "ftp://example.com/", "file:///etc/passwd", "javascript:alert(1)",
  "https://127.0.0.1/", "https://2130706433/", "https://0x7f000001/", "https://0177.0.0.1/", "https://127.1/",
  "https://169.254.169.254/latest/meta-data/", "https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://localhost/",
  "https://foo.localhost/", "https://printer.local/", "https://db.internal/", "https://intranet/", "https://example.com:8443/",
  "https://user:pw@example.com/", "https://example.com./", "https://10.0.0.1.nip.io.local/", "https://1.2.3.4/",
  "https://example.0x10/", "https://example.123/", "", "not a url",
  // 10進・8進・16進・省略形の IP、IPv4 マップ IPv6、メタデータの名前、内部の名前
  "https://0x7f.0.0.1/", "https://0177.1/", "https://017700000001/", "https://3232235777/", "https://0xa9fea9fe/",
  "https://[::ffff:a9fe:a9fe]/", "https://[fd00::1]/", "https://[::ffff:0:127.0.0.1]/", "https://LOCALHOST/",
  "https://localhost./", "https://metadata.google.internal/computeMetadata/v1/", "https://instance-data/latest/",
  "https://router.lan/", "https://nas.home.arpa/", "https://a.localdomain/", "https://169.254.169.254.nip.io.local/",
  "data:image/png;base64,AAAA", "https:///nohost", "https://exa mple.com/",
];
for (const u of badUrls) {
  try {
    parsePublicHttpsUrl(u);
    check(`URL ${JSON.stringify(u)} は拒否`, false);
  } catch (e) {
    check(`URL ${JSON.stringify(u)} は拒否`, e instanceof SsrfError, String(e));
  }
}
for (const u of ["https://example.com/a.png", "https://cdn.shopify.com/s/files/1/a.jpg?v=1", "https://example.com:443/x", "https://日本語.example.jp/"]) {
  try {
    parsePublicHttpsUrl(u);
    check(`URL ${u} は通す`, true);
  } catch (e) {
    check(`URL ${u} は通す`, false, String(e));
  }
}
// ── allowHttp（管理者の呼び出しだけ http も通す） ──
for (const u of ["http://example.com/a.png", "http://shop.example.co.jp/item?id=1", "http://example.com:80/x"]) {
  try {
    check(`allowHttp なら ${u} は通す`, parsePublicHttpsUrl(u, { allowHttp: true }).protocol === "http:");
  } catch (e) {
    check(`allowHttp なら ${u} は通す`, false, String(e));
  }
  check(`allowHttp が無ければ ${u} は拒否`, (() => { try { parsePublicHttpsUrl(u); return false; } catch (e) { return e instanceof SsrfError; } })());
  check(`allowHttp: false なら ${u} は拒否`, (() => { try { parsePublicHttpsUrl(u, { allowHttp: false }); return false; } catch (e) { return e instanceof SsrfError; } })());
}
for (const u of [
  "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://2130706433/", "http://0x7f.1/", "http://[::1]/",
  "http://localhost/", "http://db.internal/", "http://example.com:8080/", "http://example.com:443/", "http://user:pw@example.com/",
  "ftp://example.com/", "file:///etc/passwd", "gopher://example.com/", "http://metadata.google.internal/", "http://intranet/",
]) {
  try {
    parsePublicHttpsUrl(u, { allowHttp: true });
    check(`allowHttp でも ${JSON.stringify(u)} は拒否`, false);
  } catch (e) {
    check(`allowHttp でも ${JSON.stringify(u)} は拒否`, e instanceof SsrfError, String(e));
  }
}
check("allowHttp でも https はそのまま通す", parsePublicHttpsUrl("https://example.com/", { allowHttp: true }).protocol === "https:");

check("URL が長すぎると拒否", (() => { try { parsePublicHttpsUrl("https://example.com/" + "a".repeat(3000)); return false; } catch { return true; } })());
check("文字列以外は拒否", (() => { try { parsePublicHttpsUrl({ toString: () => "https://example.com" }); return false; } catch { return true; } })());

// ── 許可リスト ──
check("hostMatches 完全一致", hostMatches("cdn.shopify.com", ["cdn.shopify.com"]));
check("hostMatches 部分一致は不可", !hostMatches("evilcdn.shopify.com", ["cdn.shopify.com"]));
check("hostMatches 後方に付けても不可", !hostMatches("cdn.shopify.com.evil.com", ["cdn.shopify.com"]));
check("hostMatches ワイルドカード", hostMatches("images.ltr-online.com", ["*.ltr-online.com"]));
check("hostMatches ワイルドカードは本体を含まない", !hostMatches("ltr-online.com", ["*.ltr-online.com"]));
check("hostMatches ワイルドカードは別ドメインを含まない", !hostMatches("xltr-online.com", ["*.ltr-online.com"]));
check("hostMatches 大文字小文字を区別しない", hostMatches("CDN.Shopify.com", ["cdn.shopify.com"]));

// ── DNS（Deno.resolveDns を差し替え） ──
const dnsTable = {
  "public.example": { A: ["93.184.216.34"], AAAA: [] },
  "v6.example": { A: [], AAAA: ["2606:4700:4700::1111"] },
  "rebind.example": { A: ["93.184.216.34", "10.0.0.5"], AAAA: [] },
  "meta.example": { A: ["169.254.169.254"], AAAA: [] },
  "v6private.example": { A: ["93.184.216.34"], AAAA: ["fd00::1"] },
  "mapped.example": { A: [], AAAA: ["::ffff:127.0.0.1"] },
  "redirector.example": { A: ["93.184.216.34"], AAAA: [] },
  "hop2.example": { A: ["93.184.216.35"], AAAA: [] },
  "hop3.example": { A: ["93.184.216.36"], AAAA: [] },
  "hop4.example": { A: ["93.184.216.37"], AAAA: [] },
};
globalThis.Deno = {
  async resolveDns(host, type) {
    const row = dnsTable[host];
    if (!row) { const e = new Error("nx"); e.name = "NotFound"; throw e; }
    if (!row[type] || row[type].length === 0) { const e = new Error("no records"); e.name = "NotFound"; throw e; }
    return row[type];
  },
};

await assertPublicHttpsUrl("https://public.example/").then(() => check("DNS 公開 IPv4 は通す", true), (e) => check("DNS 公開 IPv4 は通す", false, String(e)));
await assertPublicHttpsUrl("https://v6.example/").then(() => check("DNS 公開 IPv6 は通す", true), (e) => check("DNS 公開 IPv6 は通す", false, String(e)));
await rejects("DNS に内部 IP が1件でも混じれば拒否", () => assertPublicHttpsUrl("https://rebind.example/"), 400);
await rejects("DNS がメタデータ IP を返せば拒否", () => assertPublicHttpsUrl("https://meta.example/"), 400);
await rejects("DNS が内部 IPv6 を返せば拒否", () => assertPublicHttpsUrl("https://v6private.example/"), 400);
await rejects("DNS が IPv4 マップ IPv6 を返せば拒否", () => assertPublicHttpsUrl("https://mapped.example/"), 400);
await rejects("名前が引けなければ拒否", () => assertPublicHttpsUrl("https://nxdomain.example/"), 502);

// ── safeFetch（fetch を差し替え） ──
const realFetch = globalThis.fetch;
function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  };
  return calls;
}
const redirect = (to, status = 302) => new Response(null, { status, headers: { location: to } });

let calls = stubFetch((url) => (url === "https://redirector.example/a" ? redirect("https://hop2.example/b") : new Response("hello", { status: 200 })));
let r = await safeFetch("https://redirector.example/a");
check("リダイレクトを辿って最終 URL を返す", r.finalUrl.href === "https://hop2.example/b" && (await r.response.text()) === "hello");
check("redirect: manual で呼ぶ", calls.every((c) => c.init.redirect === "manual"));

stubFetch((url) => (url === "https://public.example/" ? redirect("https://meta.example/x") : new Response("secret")));
await rejects("リダイレクト先が内部 IP を引くなら拒否", () => safeFetch("https://public.example/"), 400);

stubFetch((url) => (url === "https://public.example/" ? redirect("https://169.254.169.254/latest") : new Response("secret")));
await rejects("リダイレクト先が IP 直指定なら拒否", () => safeFetch("https://public.example/"), 400);

stubFetch((url) => (url === "https://public.example/" ? redirect("http://hop2.example/") : new Response("x")));
await rejects("リダイレクト先が http なら拒否", () => safeFetch("https://public.example/"), 400);

stubFetch((url) => {
  const next = { "https://redirector.example/": "https://hop2.example/", "https://hop2.example/": "https://hop3.example/", "https://hop3.example/": "https://hop4.example/" }[url];
  return next ? redirect(next) : new Response("end");
});
r = await safeFetch("https://redirector.example/", { maxRedirects: 3 });
check("リダイレクト3回までは辿る", (await r.response.text()) === "end");
stubFetch((url) => {
  const next = { "https://redirector.example/": "https://hop2.example/", "https://hop2.example/": "https://hop3.example/", "https://hop3.example/": "https://hop4.example/", "https://hop4.example/": "https://public.example/" }[url];
  return next ? redirect(next) : new Response("end");
});
await rejects("リダイレクト4回目は拒否", () => safeFetch("https://redirector.example/", { maxRedirects: 3 }), 502);

stubFetch((url) => (url === "https://public.example/" ? redirect("https://hop2.example/") : new Response("x")));
await rejects("validateUrl（許可リスト）をホップごとに適用", () =>
  safeFetch("https://public.example/", {
    validateUrl: (u) => { if (u.hostname !== "public.example") throw new SsrfError("not allowed", 403); },
  }), 403);

// ── safeFetch の allowHttp ──
calls = stubFetch(() => new Response("ok"));
await rejects("safeFetch は既定で http を拒否（取りに行かない）", () => safeFetch("http://public.example/"), 400);
check("拒否したときは fetch を呼ばない", calls.length === 0, `${calls.length} 回`);
r = await safeFetch("http://public.example/", { allowHttp: true });
check("allowHttp なら http を取りに行く", (await r.response.text()) === "ok" && r.finalUrl.protocol === "http:");

stubFetch((url) => (url === "http://public.example/" ? redirect("http://meta.example/") : new Response("secret")));
await rejects("allowHttp でもリダイレクト先が内部 IP を引くなら拒否", () => safeFetch("http://public.example/", { allowHttp: true }), 400);
stubFetch((url) => (url === "http://public.example/" ? redirect("http://169.254.169.254/latest") : new Response("secret")));
await rejects("allowHttp でもリダイレクト先の IP 直指定は拒否", () => safeFetch("http://public.example/", { allowHttp: true }), 400);
stubFetch((url) => (url === "http://public.example/" ? redirect("http://localhost/") : new Response("secret")));
await rejects("allowHttp でもリダイレクト先の localhost は拒否", () => safeFetch("http://public.example/", { allowHttp: true }), 400);
calls = stubFetch(() => new Response("secret"));
await rejects("allowHttp でも DNS が内部 IP なら拒否", () => safeFetch("http://rebind.example/", { allowHttp: true }), 400);
check("DNS で拒否したときは fetch を呼ばない", calls.length === 0, `${calls.length} 回`);
stubFetch((url) => (url === "https://public.example/" ? redirect("http://hop2.example/") : new Response("x")));
r = await safeFetch("https://public.example/", { allowHttp: true });
check("allowHttp なら https → http のリダイレクトも辿る", r.finalUrl.href === "http://hop2.example/");
stubFetch((url) => (url === "http://public.example/" ? redirect("http://hop2.example:8080/") : new Response("x")));
await rejects("allowHttp でもリダイレクト先の既定以外のポートは拒否", () => safeFetch("http://public.example/", { allowHttp: true }), 400);
await rejects("assertPublicHttpsUrl も既定で http を拒否", () => assertPublicHttpsUrl("http://public.example/"), 400);
await assertPublicHttpsUrl("http://public.example/", { allowHttp: true }).then(
  () => check("assertPublicHttpsUrl も allowHttp なら http を通す", true),
  (e) => check("assertPublicHttpsUrl も allowHttp なら http を通す", false, String(e))
);

// ── 画像の種類の判定 ──
const bytesOf = (...parts) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
check("sniff JPEG", sniffImageMediaType(bytesOf([0xff, 0xd8, 0xff, 0xe0, 0, 0])) === "image/jpeg");
check("sniff PNG", sniffImageMediaType(bytesOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])) === "image/png");
check("sniff GIF", sniffImageMediaType(bytesOf("GIF89a", [1, 2])) === "image/gif");
check("sniff WebP", sniffImageMediaType(bytesOf("RIFF", [0, 0, 0, 0], "WEBPVP8 ")) === "image/webp");
check("sniff AVIF", sniffImageMediaType(bytesOf([0, 0, 0, 0x1c], "ftypavif")) === "image/avif");
check("sniff HTML は画像でない", sniffImageMediaType(bytesOf("<!doctype html>")) === null);
check("sniff SVG は画像として扱わない", sniffImageMediaType(bytesOf("<svg xmlns=")) === null);
check("sniff 空は null", sniffImageMediaType(new Uint8Array(0)) === null);

// ── 本文の上限 ──
function streamOf(chunks) {
  return new Response(new ReadableStream({
    start(controller) { for (const c of chunks) controller.enqueue(new Uint8Array(c)); controller.close(); },
  }));
}
check("上限以内なら全部読む", (await readBodyCapped(streamOf([[1, 2, 3], [4, 5]]), 10)).byteLength === 5);
await rejects("ストリームの途中で上限を超えたら 413", () => readBodyCapped(streamOf([[1, 2, 3], [4, 5, 6]]), 5), 413);
await rejects("Content-Length が上限超えなら読まずに 413", () => readBodyCapped(new Response("abc", { headers: { "content-length": "999" } }), 5), 413);
check("truncate なら上限で打ち切って返す", (await readBodyCapped(streamOf([[1, 2, 3], [4, 5, 6]]), 5, { truncate: true })).byteLength === 5);

// DNS が使えない環境
globalThis.Deno = {};
await rejects("resolveDns が無い環境では既定で拒否", () => assertPublicHttpsUrl("https://public.example/"), 502);
await assertPublicHttpsUrl("https://public.example/", { allowDnsUnavailable: true }).then(
  () => check("allowDnsUnavailable なら通す", true),
  (e) => check("allowDnsUnavailable なら通す", false, String(e))
);

globalThis.fetch = realFetch;
console.log(failed === 0 ? "\nすべて通過" : `\n${failed} 件失敗`);
process.exit(failed === 0 ? 0 : 1);
