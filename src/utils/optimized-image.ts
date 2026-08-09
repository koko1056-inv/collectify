import { SUPABASE_URL } from "@/integrations/supabase/client";

const STORAGE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;
const RENDER_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/render/image/public/`;

/**
 * Supabase Storage の公開URLを画像変換(リサイズ+WebP)URLに変換する。
 * AI生成画像はオリジナルが1.5MB超あり、フィードでそのまま配信すると
 * 1画面で20MB以上になる。width=600 + quality=75 なら約50KB(33分の1)。
 * Storage以外のURLはそのまま返す。変換が失敗する環境に備えて、
 * 呼び出し側は onError で元URLへフォールバックすること。
 */
export function getOptimizedImageUrl(
  url: string,
  opts: { width: number; quality?: number }
): string {
  if (!url || !url.startsWith(STORAGE_PUBLIC_PREFIX)) return url;
  const path = url.slice(STORAGE_PUBLIC_PREFIX.length);
  const sep = path.includes("?") ? "&" : "?";
  return `${RENDER_PUBLIC_PREFIX}${path}${sep}width=${opts.width}&quality=${opts.quality ?? 75}`;
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
