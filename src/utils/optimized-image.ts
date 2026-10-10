import { SUPABASE_URL } from "@/integrations/supabase/client";
import { md5Hex } from "@/utils/md5";

const STORAGE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;
const RENDER_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/render/image/public/`;

/**
 * カタログ画像のサムネ（サーバー側で 480px 以内の WebP に縮めたもの）の置き場所。
 * supabase/functions/catalog-thumbs が official_items.image の文字列の md5 をファイル名にして置く。
 * 版（v1）を上げるときは関数側の PATH_VERSION と同時に上げる。
 */
const CATALOG_THUMB_PREFIX = `${STORAGE_PUBLIC_PREFIX}catalog-thumbs/v1/`;
/** サムネの大きさ（長辺 px）。これ以下の幅で表示するときだけサムネを使う */
export const CATALOG_THUMB_MAX_WIDTH = 480;

/**
 * サムネを使うかどうか。全件のサムネ作り（バックフィル）が終わるまでは false にしておく。
 * まだ無いサムネを先に取りに行くと 404 を待ってから元の経路に戻るため、今より遅くなる。
 * バックフィルが終わったら true にする。
 */
export const CATALOG_THUMBS_ENABLED = false;

const thumbCache = new Map<string, string>();

/**
 * 外部サイトのカタログ画像URL → サーバー側で作ったサムネのURL。対象外なら null。
 *
 * 一覧で外部の原寸画像（1000〜2000px・数百KB）を直接・または proxy-image 経由で取ると
 * 1枚 1〜3 秒かかる。サムネは Storage の CDN から 10〜40KB で返る。
 * まだ作られていない画像は 404 になるので、呼び出し側は onError で元の経路に戻すこと
 * （fallbackToOriginal / LazyImage はそうしている）。
 */
export function getCatalogThumbUrl(src: string | null | undefined): string | null {
  if (!CATALOG_THUMBS_ENABLED) return null;
  if (!src || !src.startsWith("https://")) return null;
  // 自前の Storage の画像は画像変換で縮めるので対象外（proxy-image 経由のURLは対象）
  if (src.includes("/storage/v1/")) return null;
  const cached = thumbCache.get(src);
  if (cached !== undefined) return cached;
  const url = `${CATALOG_THUMB_PREFIX}${md5Hex(src)}.webp`;
  if (thumbCache.size > 5000) thumbCache.clear();
  thumbCache.set(src, url);
  return url;
}

/**
 * Supabase Storage の公開URLを画像変換(リサイズ+WebP)URLに変換する。
 * AI生成画像はオリジナルが1.5MB超あり、フィードでそのまま配信すると
 * 1画面で20MB以上になる。width=600 + quality=75 なら約50KB(33分の1)。
 * 外部サイトのカタログ画像は、幅 480 以下ならサーバー側で作ったサムネ（getCatalogThumbUrl）を返す。
 * それ以外のURLはそのまま返す。変換・サムネが無い場合に備えて、
 * 呼び出し側は onError で元URLへフォールバックすること。
 */
export function getOptimizedImageUrl(
  url: string,
  opts: { width: number; quality?: number }
): string {
  if (url && opts.width <= CATALOG_THUMB_MAX_WIDTH) {
    const thumb = getCatalogThumbUrl(url);
    if (thumb) return thumb;
  }
  if (!url || !url.startsWith(STORAGE_PUBLIC_PREFIX)) return url;
  const path = url.slice(STORAGE_PUBLIC_PREFIX.length);
  const sep = path.includes("?") ? "&" : "?";
  // resize を省くと既定の cover になり、幅だけ指定した場合に正方形の写真が
  // 320x2000 のような細長い切り抜きで返ってくる。常に全体が入る contain にする。
  return `${RENDER_PUBLIC_PREFIX}${path}${sep}width=${opts.width}&quality=${opts.quality ?? 75}&resize=contain`;
}

/**
 * 署名付きURLなど public 以外の Storage URL も含めて変換する版。
 * LazyImage の srcset 生成で使う。変換できない相手には null を返す。
 */
export function toRenderUrl(src: string, width: number, quality: number): string | null {
  if (!src.includes("/storage/v1/object/")) return null;
  const rendered = src.replace("/storage/v1/object/", "/storage/v1/render/image/");
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/** 外部URL → Supabase の Edge プロキシ経由に変換 */
export function toProxyUrl(src: string): string {
  return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(src)}`;
}

/**
 * 画像変換URLの読み込みに失敗したとき、一度だけ元のURLに切り替える onError ハンドラ。
 *
 * 画像変換は Supabase のプラン依存の機能なので、使えない環境では
 * 変換URLが失敗する。そのまま何も出ないより、重くても元画像を出すほうがよい。
 */
export function fallbackToOriginal(originalUrl: string) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    if (img.dataset.originalFallback === "1") return; // 無限ループ防止
    img.dataset.originalFallback = "1";
    img.src = originalUrl;
  };
}
