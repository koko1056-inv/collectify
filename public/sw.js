/* Collectify のサービスワーカー。
 *
 * 目的は「ホーム画面から開いたとき速く、電波が悪くても画面の骨組みが出る」こと。
 * データ（Supabase・決済・AI）は絶対にキャッシュしない。古い残高や在庫を見せないため。
 *
 *  - ページ移動（HTML）: ネットワーク優先。4秒で返らなければ控えた骨組みを出す。
 *    SPA なのでどの画面も同じ index.html。新しい配信にはすぐ追従する
 *  - /assets/（ハッシュ付き・不変）: キャッシュ優先
 *  - 画像・アイコン: 控えを先に出しつつ裏で更新
 *  - /api/・他のオリジン・GET 以外: 一切さわらない
 */
const VERSION = "v1";
const SHELL_CACHE = `collectify-shell-${VERSION}`;
const ASSET_CACHE = `collectify-assets-${VERSION}`;
const IMAGE_CACHE = `collectify-images-${VERSION}`;
const KEEP = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE];
const OFFLINE_URL = "/offline.html";
const NAV_TIMEOUT_MS = 4000;
const MAX_ASSETS = 250;
const MAX_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.all([
          cache.addAll([OFFLINE_URL, "/icon-192.png", "/favicon.ico"]),
          // 画面の骨組み。取れなくてもインストール自体は失敗させない
          cache.add("/").catch(() => undefined),
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  // 転送先・エラー・他オリジンの不透明な応答は控えない
  return res && res.status === 200 && res.type === "basic";
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
    if (cacheable(res) && (res.headers.get("content-type") || "").includes("text/html")) {
      // どの画面も同じ骨組み。"/" の名前で1つだけ控える
      cache.put("/", res.clone());
    }
    return res;
  } catch {
    return (await cache.match("/")) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) {
    cache.put(request, res.clone());
    trim(cacheName, max);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then((res) => {
      if (cacheable(res)) {
        cache.put(request, res.clone());
        trim(cacheName, max);
      }
      return res;
    })
    .catch(() => undefined);
  return hit || (await update) || Response.error();
}

// 初回の訪問は、サービスワーカーが入る前に読み込みが終わっているため、
// そのとき使った静的ファイルは控えられていない。ページ側から教えてもらって、あとから控える。
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      for (const raw of data.urls.slice(0, MAX_ASSETS)) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/")) continue;
          if (await cache.match(url.pathname)) continue;
          const res = await fetch(url.pathname);
          if (cacheable(res)) await cache.put(url.pathname, res);
        } catch {
          /* 取れないものは飛ばす。次の訪問で控える */
        }
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE, MAX_ASSETS));
    return;
  }
  if (/\.(?:png|jpg|jpeg|webp|svg|ico|gif)$/i.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGES));
  }
});
