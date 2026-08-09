/**
 * アップロード前に画像を縮小・圧縮する。
 *
 * これまでは端末で撮った写真をそのまま保存していた。
 * 最近のスマホの写真は 3〜8MB・長辺4000px級あり、
 * それを一覧の120pxのマスに並べて表示していたので、
 * 表示に必要な量の何十倍もの通信が毎回発生していた。
 *
 * ここで一度縮めておけば、以後その画像を見るすべての画面が軽くなる。
 * 失敗したときは元のファイルをそのまま返す（登録自体は成功させたい）。
 */

export interface CompressOptions {
  /** 長辺の最大ピクセル数 */
  maxEdge?: number;
  /** JPEG 品質 (0〜1) */
  quality?: number;
}

/** グッズ写真など、拡大表示もされうる画像の既定値 */
export const ITEM_IMAGE_OPTIONS: CompressOptions = { maxEdge: 1600, quality: 0.82 };
/** アバターやプロフィール画像。正方形に近い小さめの表示しかしない */
export const AVATAR_IMAGE_OPTIONS: CompressOptions = { maxEdge: 1024, quality: 0.85 };

/** 保存時に付けるキャッシュ期間（秒）。画像は差し替えでなく新規パスで増えるので長くてよい。 */
export const UPLOAD_CACHE_CONTROL = "31536000";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "image"}.${ext}`;
}

/**
 * 縮小した File を返す。
 *
 * - 元より大きくなってしまう場合は元を返す（小さいPNGなどで起こりうる）
 * - GIF はアニメーションが失われるので触らない
 * - 変換に失敗した場合も元を返す
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = ITEM_IMAGE_OPTIONS
): Promise<File> {
  const { maxEdge = 1600, quality = 0.82 } = options;

  // 画像でないもの、アニメーションGIF、SVGはそのまま
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, maxEdge / longest);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, quality);
    if (!blob) return file;

    // 縮めたつもりが太った場合は元を使う
    if (blob.size >= file.size) return file;

    return new File([blob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("[compressImageFile] failed, using original:", error);
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
