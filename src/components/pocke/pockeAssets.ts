/**
 * ポッケの絵の種類と置き場所。部品（Pocke.tsx）から分けておく（Fast Refresh は部品だけのファイルで効くため）。
 * 絵は public/pocke/<pose>.webp（背景透明・縦 480px）。Higgsfield で作った同じキャラの描き分け。
 */
export type PockePose =
  | "wave" // 手を振る（あいさつ）
  | "point" // 指さし（ここを押してね）
  | "celebrate" // ジャンプ（お祝い）
  | "pouch" // 袋いっぱいのグッズ（登録・コレクション）
  | "cheer" // ポンポン（応援）
  | "peek" // ひょっこり（頭と手だけ。小さく出すとき）
  | "think" // 考え中（おすすめ）
  | "surprised" // びっくり
  | "sad" // しょんぼり（ひさしぶり）
  | "sleepy" // おねむ
  | "love" // ハート目（推し）
  | "wink"; // ウインク＋グッド（できたね）

/** 絵の縦横比（幅 / 高さ）。読み込む前から場所を取って、表示がずれないようにする */
export const POCKE_ASPECT: Record<PockePose, number> = {
  wave: 365 / 480,
  point: 370 / 480,
  celebrate: 411 / 480,
  pouch: 333 / 480,
  cheer: 454 / 480,
  peek: 480 / 467,
  think: 306 / 480,
  surprised: 330 / 480,
  sad: 351 / 480,
  sleepy: 390 / 480,
  love: 334 / 480,
  wink: 356 / 480,
};

export const pockeSrc = (pose: PockePose) => `/pocke/${pose}.webp`;
