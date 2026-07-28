/**
 * 画像を縮小して data URL にする。
 *
 * sessionStorage 経由で写真を別画面へ引き継ぐために使う。
 * base64 は元サイズの約1.33倍になり、sessionStorage の上限は多くのブラウザで
 * 約5MB（実装によっては UTF-16 で2バイト換算）なので、スマホカメラの
 * 3〜8MB の写真をそのまま載せると保存に失敗する。
 *
 * 縮小後の画像は「引き継ぎ用」であり、実際にアップロードされるのは
 * 登録フロー側で選び直された元ファイル、または縮小後のこの画像。
 * AI解析に使う分には長辺1600pxで十分。
 */
export interface DownscaleOptions {
  /** 長辺の最大ピクセル数 */
  maxEdge?: number;
  /** JPEG 品質 (0〜1) */
  quality?: number;
}

export async function downscaleToDataUrl(
  source: File | Blob | string,
  { maxEdge = 1600, quality = 0.8 }: DownscaleOptions = {}
): Promise<string | null> {
  try {
    const objectUrl = typeof source === "string" ? source : URL.createObjectURL(source);

    try {
      const img = await loadImage(objectUrl);

      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, width, height);

      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      if (typeof source !== "string") URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.error("[downscaleToDataUrl] failed:", error);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
