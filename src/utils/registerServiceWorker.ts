import { Capacitor } from "@capacitor/core";

/**
 * サービスワーカーを登録する（本番のブラウザだけ）。
 * - 開発中は登録しない。古い控えが残って、直したはずの画面が変わらなくなるため
 * - ネイティブアプリ（Capacitor）の中では不要
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  if (Capacitor.isNativePlatform()) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  // 初回表示を邪魔しないよう、読み込みが終わってから登録する
  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // いま使っている静的ファイルを、サービスワーカーに控えてもらう（初回でも電波が切れて開けるように）
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name, location.href))
          .filter((u) => u.origin === location.origin && u.pathname.startsWith("/assets/"))
          .map((u) => u.pathname);
        reg.active?.postMessage({ type: "CACHE_URLS", urls });
      })
      .catch((err) => {
        console.error("[sw] registration failed:", err);
      });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
