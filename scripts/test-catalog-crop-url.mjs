// 切り出し画像（catalog-crops/）を画像変換に載せない判定。
//
//   node --experimental-strip-types scripts/test-catalog-crop-url.mjs

import { directCatalogCropUrl, isCatalogCropStorageUrl } from "../src/utils/catalog-crop-url.ts";

const BASE = "https://dmgrgzysrzzgsajwqyrh.supabase.co";
const OBJECT = `${BASE}/storage/v1/object/public/kuji_images/catalog-crops/holo/11111111-1111-4111-8111-111111111111.jpg`;
const RENDER = `${BASE}/storage/v1/render/image/public/kuji_images/catalog-crops/holo/11111111-1111-4111-8111-111111111111.jpg?width=300&quality=75&resize=contain`;
const SIGN = `${BASE}/storage/v1/object/sign/kuji_images/catalog-crops/holo/11111111-1111-4111-8111-111111111111.webp?token=keep-me`;
const OTHER = `${BASE}/storage/v1/object/public/profile_images/avatar.png`;
const THUMB = `${BASE}/storage/v1/object/public/catalog-thumbs/v1/abc.webp`;
const EXTERNAL = "https://cdn.shopify.com/s/files/1/x/y.png";

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
}

check("公開オブジェクトは直接配信", isCatalogCropStorageUrl(OBJECT, BASE));
check("render URL も切り出し画像とみなす", isCatalogCropStorageUrl(RENDER, BASE));
check("署名 URL も切り出し画像とみなす", isCatalogCropStorageUrl(SIGN, BASE));
check("別バケットは変換対象のまま", !isCatalogCropStorageUrl(OTHER, BASE));
check("サムネは変換対象のまま", !isCatalogCropStorageUrl(THUMB, BASE));
check("外部 URL は対象外", !isCatalogCropStorageUrl(EXTERNAL, BASE));
check("空は対象外", !isCatalogCropStorageUrl(null, BASE) && !isCatalogCropStorageUrl("", BASE));
check(
  "他ホストの似たパスは対象外",
  !isCatalogCropStorageUrl(`https://evil.example/storage/v1/object/public/kuji_images/catalog-crops/a.jpg`, BASE),
);

check("オブジェクト URL はそのまま", directCatalogCropUrl(OBJECT, BASE) === OBJECT);
check(
  "render URL は object URL に戻り、変換パラメータを外す",
  directCatalogCropUrl(RENDER, BASE) === OBJECT,
);
check(
  "署名トークンは残す",
  directCatalogCropUrl(SIGN, BASE) === SIGN,
);
check("対象外はそのまま", directCatalogCropUrl(OTHER, BASE) === OTHER);
check(
  "authenticated render も object に戻す",
  directCatalogCropUrl(
    `${BASE}/storage/v1/render/image/authenticated/kuji_images/catalog-crops/holo/a.jpg?width=96&format=origin`,
    BASE,
  ) === `${BASE}/storage/v1/object/authenticated/kuji_images/catalog-crops/holo/a.jpg`,
);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
