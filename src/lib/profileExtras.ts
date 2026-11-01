// 「あなたのこと」（性別・年代・都道府県・推し活のこと）の選択肢と、保存前の整え方。
//
// 保存先は本人だけが読み書きできる public.profile_private（migrations/20261101120000_profile_private.sql）。
// profiles は公開プロフィールとして他の人（未ログインを含む）からも読めるので、そこには置かない。
// すべて任意。答えなくても、どの画面も先へ進める。
// 選択肢を変えるときは、マイグレーションの CHECK と翻訳（src/translations/modules/profileExtras.ts）も揃えること
// （scripts/test-profile-extras.mjs が食い違いを見つける）。
//
// React も Supabase も触らない純粋な関数だけにしてある（scripts/ のテストから直接読む）。

export const GENDERS = ["female", "male", "other", "no_answer"] as const;
/** 年代。利用規約で13歳未満は使えないので「〜12歳」は置かない */
export const AGE_RANGES = ["13_19", "20s", "30s", "40s", "50_plus", "no_answer"] as const;
export const OSHI_YEARS = ["just_started", "lt_1y", "1_3y", "3_5y", "5y_plus"] as const;
export const MONTHLY_BUDGETS = ["lt_3k", "3k_10k", "10k_30k", "30k_plus", "secret"] as const;
export const GOODS_TYPES = [
  "can_badge",
  "acrylic_stand",
  "acrylic_keychain",
  "plush",
  "trading_card",
  "gacha_kuji",
  "cd_live",
  "other",
] as const;
export const TRADE_FREQUENCIES = ["often", "sometimes", "never"] as const;

export type Gender = (typeof GENDERS)[number];
export type AgeRange = (typeof AGE_RANGES)[number];
export type OshiYears = (typeof OSHI_YEARS)[number];
export type MonthlyBudget = (typeof MONTHLY_BUDGETS)[number];
export type GoodsType = (typeof GOODS_TYPES)[number];
export type TradeFrequency = (typeof TRADE_FREQUENCIES)[number];

/** 都道府県（JIS X 0401 の番号順。保存は ISO 3166-2 の "JP-01" 〜 "JP-47"） */
export const PREFECTURES: readonly { code: string; ja: string; en: string }[] = [
  ["北海道", "Hokkaido"], ["青森県", "Aomori"], ["岩手県", "Iwate"], ["宮城県", "Miyagi"], ["秋田県", "Akita"],
  ["山形県", "Yamagata"], ["福島県", "Fukushima"], ["茨城県", "Ibaraki"], ["栃木県", "Tochigi"], ["群馬県", "Gunma"],
  ["埼玉県", "Saitama"], ["千葉県", "Chiba"], ["東京都", "Tokyo"], ["神奈川県", "Kanagawa"], ["新潟県", "Niigata"],
  ["富山県", "Toyama"], ["石川県", "Ishikawa"], ["福井県", "Fukui"], ["山梨県", "Yamanashi"], ["長野県", "Nagano"],
  ["岐阜県", "Gifu"], ["静岡県", "Shizuoka"], ["愛知県", "Aichi"], ["三重県", "Mie"], ["滋賀県", "Shiga"],
  ["京都府", "Kyoto"], ["大阪府", "Osaka"], ["兵庫県", "Hyogo"], ["奈良県", "Nara"], ["和歌山県", "Wakayama"],
  ["鳥取県", "Tottori"], ["島根県", "Shimane"], ["岡山県", "Okayama"], ["広島県", "Hiroshima"], ["山口県", "Yamaguchi"],
  ["徳島県", "Tokushima"], ["香川県", "Kagawa"], ["愛媛県", "Ehime"], ["高知県", "Kochi"], ["福岡県", "Fukuoka"],
  ["佐賀県", "Saga"], ["長崎県", "Nagasaki"], ["熊本県", "Kumamoto"], ["大分県", "Oita"], ["宮崎県", "Miyazaki"],
  ["鹿児島県", "Kagoshima"], ["沖縄県", "Okinawa"],
].map(([ja, en], i) => ({ code: `JP-${String(i + 1).padStart(2, "0")}`, ja, en }));

export interface ProfileExtras {
  gender: Gender | null;
  age_range: AgeRange | null;
  prefecture: string | null;
  oshi_years: OshiYears | null;
  monthly_budget: MonthlyBudget | null;
  goods_types: GoodsType[];
  trade_frequency: TradeFrequency | null;
}

export const EMPTY_PROFILE_EXTRAS: ProfileExtras = {
  gender: null,
  age_range: null,
  prefecture: null,
  oshi_years: null,
  monthly_budget: null,
  goods_types: [],
  trade_frequency: null,
};

function pick<T extends string>(list: readonly T[], v: unknown): T | null {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
}

const PREFECTURE_CODES = new Set(PREFECTURES.map((p) => p.code));

/**
 * 保存する前・読み込んだあとに、知らない値を落とす（DB の CHECK に当たって保存ごと失敗しないように）。
 * 複数選択は重ねず、選択肢の並び順にそろえる。
 */
export function sanitizeProfileExtras(input: Partial<Record<keyof ProfileExtras, unknown>> | null | undefined): ProfileExtras {
  const v = input ?? {};
  const types = Array.isArray(v.goods_types) ? v.goods_types : [];
  return {
    gender: pick(GENDERS, v.gender),
    age_range: pick(AGE_RANGES, v.age_range),
    prefecture: typeof v.prefecture === "string" && PREFECTURE_CODES.has(v.prefecture) ? v.prefecture : null,
    oshi_years: pick(OSHI_YEARS, v.oshi_years),
    monthly_budget: pick(MONTHLY_BUDGETS, v.monthly_budget),
    goods_types: GOODS_TYPES.filter((g) => types.includes(g)),
    trade_frequency: pick(TRADE_FREQUENCIES, v.trade_frequency),
  };
}

/** 答えた項目の数（7項目のうち。設定の一覧に「3項目に回答」と出す） */
export function answeredCount(v: ProfileExtras): number {
  return [
    v.gender !== null,
    v.age_range !== null,
    v.prefecture !== null,
    v.oshi_years !== null,
    v.monthly_budget !== null,
    v.goods_types.length > 0,
    v.trade_frequency !== null,
  ].filter(Boolean).length;
}

/** 1つでも答えたか */
export function hasAnyAnswer(v: ProfileExtras): boolean {
  return answeredCount(v) > 0;
}

/** チップの1つ選び: 同じものをもう一度押したら外す（答えないに戻せる） */
export function toggleSingle<T extends string>(current: T | null, tapped: T): T | null {
  return current === tapped ? null : tapped;
}

/** チップの複数選び: 押したら足す／外す（並びは選択肢の順） */
export function toggleMulti(current: readonly GoodsType[], tapped: GoodsType): GoodsType[] {
  const next = current.includes(tapped) ? current.filter((g) => g !== tapped) : [...current, tapped];
  return GOODS_TYPES.filter((g) => next.includes(g));
}

export interface ProfileExtrasNudgeInput {
  signedIn: boolean;
  /** はじめてのウェルカムを終えている（ウェルカムの中では、そちらのステップで聞く） */
  welcomeDone: boolean;
  /** 公式サンプルアカウントか（読めていないあいだは null） */
  isSample: boolean | null;
  /**
   * profile_private の自分の行を読んだ結果。
   *   "missing" = 行が無い（まだ一度も聞いていない）
   *   "exists"  = 行がある（答えた・ウェルカムで聞いた・案内を閉じた）
   *   "unknown" = 読めていない（読み込み中・失敗・テーブルがまだ無い）
   */
  row: "missing" | "exists" | "unknown";
  /** この端末で案内を閉じた（保存に失敗したときの控え） */
  dismissedLocally: boolean;
}

/**
 * すでに使っている人への「あなたのこと、よかったら教えてね」を出してよいか。1回きり。
 * 閉じたら profile_private に空の行を作って「聞いた」印にする（別の端末でも出ない）。
 */
export function shouldNudgeProfileExtras(i: ProfileExtrasNudgeInput): boolean {
  return i.signedIn && i.welcomeDone && i.isSample === false && i.row === "missing" && !i.dismissedLocally;
}
