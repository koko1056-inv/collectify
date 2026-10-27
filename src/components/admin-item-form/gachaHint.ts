/**
 * ガチャ・くじ・ランダム（ブラインド）商品らしい名前か。
 * こういう商品はシリーズまるごと1件で登録されがちだが、交換やコンプはキャラ単位で探すので、
 * 「キャラごとに1件」の案内を強めに出す目印にする（登録は止めない）。
 */
const GACHA_PATTERN =
  /ガチャ|ｶﾞﾁｬ|がちゃ|カプセル|くじ|クジ|ランダム|ブラインド|シークレット|トレーディング|全\s*[0-9０-９]+\s*種|gacha|capsule|blind\s*box|random|trading/i;

export function looksLikeGacha(title: string | null | undefined): boolean {
  return !!title && GACHA_PATTERN.test(title);
}
