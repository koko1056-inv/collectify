/**
 * 切り出し済みカタログ画像（公開バケット kuji_images の catalog-crops/）。
 * 長辺 800px 以下に縮めてあるので、Storage の画像変換（/render/image/）に載せない。
 * render は元画像の枚数で課金される。
 */

const TRANSFORM_PARAMS = ["width", "height", "quality", "resize", "format"];

function markers(supabaseUrl: string): string[] {
  const base = supabaseUrl.replace(/\/$/, "");
  const folder = "/kuji_images/catalog-crops/";
  return [
    `${base}/storage/v1/object/public${folder}`,
    `${base}/storage/v1/object/sign${folder}`,
    `${base}/storage/v1/render/image/public${folder}`,
    `${base}/storage/v1/render/image/sign${folder}`,
    `${base}/storage/v1/render/image/authenticated${folder}`,
  ];
}

/** このプロジェクトの Storage にある catalog-crops/ の URL か（公開・署名・render のいずれも） */
export function isCatalogCropStorageUrl(
  url: string | null | undefined,
  supabaseUrl: string,
): boolean {
  if (!url || !supabaseUrl) return false;
  return markers(supabaseUrl).some((marker) => url.startsWith(marker));
}

/**
 * catalog-crops/ の URL を、画像変換を通さないオブジェクト URL にする。
 * render URL は object URL に戻し、width などの変換パラメータだけ外す。
 * 署名トークンなど、それ以外のクエリは残す。対象外の URL はそのまま返す。
 */
export function directCatalogCropUrl(url: string, supabaseUrl: string): string {
  if (!isCatalogCropStorageUrl(url, supabaseUrl)) return url;
  const rewritten = url.replace("/storage/v1/render/image/", "/storage/v1/object/");
  try {
    const parsed = new URL(rewritten);
    for (const key of TRANSFORM_PARAMS) parsed.searchParams.delete(key);
    const qs = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${qs ? `?${qs}` : ""}${parsed.hash}`;
  } catch {
    return rewritten;
  }
}
