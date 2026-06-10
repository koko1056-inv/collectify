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
