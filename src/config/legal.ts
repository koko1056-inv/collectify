/**
 * 法務ページに載せる運営者の情報。
 *
 * 特定商取引法の表記（/tokushoho）などに使う。空のものは、ページ側で
 * 「請求があった場合は遅滞なく開示します」という表記に切り替わる（空のまま公開しても虚偽にならない）。
 * 住所・代表者・電話番号を載せる場合は、ここに入れるだけでよい。
 */
export const LEGAL_OPERATOR = {
  /** 運営者（販売事業者）の名称（日本語） */
  name: "ＭＧＣ株式会社",
  /** 運営者（販売事業者）の名称（英語表記） */
  nameEn: "MGC Inc.",
  /** 運営責任者（代表者）の氏名。空なら請求により開示 */
  representative: "代表取締役 松尾 心夢",
  /** 運営責任者（代表者）の氏名（英語表記） */
  representativeEn: "Kokomu Matsuo, Representative Director",
  /** 所在地。空なら請求により開示 */
  address: "〒602-8107 京都府京都市上京区西辰巳町111 アビタシオンオンズアン106",
  /** 所在地（英語表記） */
  addressEn: "Abitation Onzuan 106, 111 Nishitatsumi-cho, Kamigyo-ku, Kyoto 602-8107, Japan",
  /** 電話番号。空なら請求により開示。特商法表記以外の場所にも一切掲載しないこと */
  phone: "",
  /** 問い合わせ用メールアドレス。空ならアプリ内のお問い合わせ窓口のみを案内する */
  email: "contact@mgc-global01.com",
  /** 文書の最終更新日（YYYY-MM-DD） */
  updatedAt: "2026-10-21",
} as const;
