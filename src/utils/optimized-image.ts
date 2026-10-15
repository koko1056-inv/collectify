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
 * サムネを使うかどうか。全件のサムネ作り（バックフィル）は 2026-10-10 に終わった（約4.9万枚）。
 * 新しく登録されたグッズは cron（catalog-thumbs-recent）が10分ごとに作り、作れなかったものは
 * catalog-thumbs-retry が拾い直す。それまでの間はサムネが 400 を返し、元の経路に戻る。
 */
export const CATALOG_THUMBS_ENABLED = true;

/**
 * 詳細画面（1枚を大きく出す）で読む幅。ダイアログは最大で幅 448px 前後なので、3倍密度の画面でも 1080px で足りる。
 * 元画像（ユーザーの写真は 1〜2MB の PNG もある）をそのまま読むと、4G で 1 枚 1 秒以上かかっていた。
 * 外部のカタログ画像はサムネ（480px）より大きいので、元画像のまま（getOptimizedImageUrl がそうする）。
 */
export const DETAIL_IMAGE_WIDTH = 1080;

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
 * アバター（丸い小さな顔写真）用。Storage の画像だけを画像変換で縮める。
 *
 * profile_images の元画像は 1024px・1MB 以上の PNG が多く、ヘッダーの 28px のアイコンにも
 * それをそのまま読んでいた（みんなの投稿の画面で 1 枚 1.2MB）。
 * 外部のアバター（SNS のアイコンなど）はカタログのサムネが無いので、そのまま返す
 * （getOptimizedImageUrl だとサムネを探して 400 を 1 回余計に受けるため）。
 */
export function getAvatarImageUrl(src: string | null | undefined, width: number): string | undefined {
  if (!src) return undefined;
  if (!src.includes("/storage/v1/object/")) return src;
  return toRenderUrl(src, width, 75) ?? src;
}

/**
 * 縮めた画像（画像変換・カタログのサムネ）の読み込みに失敗したときの onError ハンドラ。
 *  1回目: 元のURLに切り替える（画像変換が使えない・サムネがまだ無い）
 *  2回目: 外部の画像なら proxy-image 経由にする（直リンクを断るサイトがある）
 *
 * 同じ <img> に別の画像が入った（React が要素を使い回した）ときは、段階を数え直す。
 * 以前は「一度切り替えたか」だけを覚えていたので、使い回された <img> では二度と元に戻せなかった。
 */
export function fallbackToOriginal(originalUrl: string | null | undefined) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    if (!originalUrl) return;
    if (img.dataset.fallbackFor !== originalUrl) {
      img.dataset.fallbackFor = originalUrl;
      img.dataset.fallbackStage = "0";
    }
    const stage = Number(img.dataset.fallbackStage ?? "0");
    if (stage === 0) {
      img.dataset.fallbackStage = "1";
      // srcset が残っていると src を変えても使われない
      img.removeAttribute("srcset");
      img.src = originalUrl;
      return;
    }
    if (stage === 1 && originalUrl.startsWith("https://") && !originalUrl.includes("/storage/v1/") && !originalUrl.includes("/functions/v1/proxy-image")) {
      img.dataset.fallbackStage = "2";
      img.src = toProxyUrl(originalUrl);
    }
    // それ以上は何もしない（無限ループ防止）
  };
}
