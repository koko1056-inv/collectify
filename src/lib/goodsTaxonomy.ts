/**
 * グッズのカテゴリ（グッズタイプ）の分類表。
 *
 * カタログのカテゴリは official_items.item_type ではなく、tags.category = 'type' のタグ（item_tags で紐付け）。
 * タグ名はそのまま「小分類（leaf）」として使い、ここで「大分類（group）」にまとめる。
 * 広く使われているタグ名は変えない（取り込みスクリプトや既存の紐付けが名前で引いているため）。
 *
 * 同じ表を SQL にも置いている: supabase/migrations/20261027220000_category_tag_cleanup.sql の
 * public.goods_type_groups（VALUES の並び）。片方だけ直さないこと（npm run test:taxonomy が両方を突き合わせる）。
 */

export type GoodsGroupKey =
  | "acrylic"
  | "badge"
  | "plush"
  | "keychain"
  | "card"
  | "media"
  | "magazine"
  | "live"
  | "stationery"
  | "fashion"
  | "lifestyle"
  | "figure"
  | "other";

export interface GoodsGroup {
  key: GoodsGroupKey;
  /** 小分類（= type タグの名前）。並びは画面の既定の並び（件数が取れるときは件数順にする） */
  leaves: readonly string[];
}

/** 大分類。画面にはこの順で並べる。名前は翻訳（catalogFilters.groups.<key>）にある */
export const GOODS_GROUPS: readonly GoodsGroup[] = [
  { key: "acrylic", leaves: ["アクリルスタンド", "アクリルフォト", "アクスタンプ"] },
  { key: "badge", leaves: ["缶バッジ", "ピンズ", "ワッペン", "ブローチ"] },
  { key: "plush", leaves: ["ぬいぐるみ", "マスコット"] },
  { key: "keychain", leaves: ["キーホルダー", "ラバー"] },
  { key: "card", leaves: ["カード", "フォトカード", "ブロマイド", "ミニ色紙", "ポスター", "カードホルダー"] },
  { key: "media", leaves: ["CD", "映像", "レコード", "アルバム"] },
  { key: "magazine", leaves: ["雑誌"] },
  { key: "live", leaves: ["うちわ", "ペンライト", "バンド"] },
  {
    key: "stationery",
    leaves: ["文房具", "筆記具", "ペン", "ノート", "付箋", "クリアファイル", "ステッカー", "レターセット", "バインダー"],
  },
  {
    key: "fashion",
    leaves: [
      "Tシャツ", "パーカー", "ウェア", "スウェット", "ジャケット", "ニット", "靴下", "キャップ", "スカーフ",
      "バッグ", "ポーチ", "アクセサリー", "ヘアアクセサリー", "ブレスレット", "コスメ", "ネイル",
    ],
  },
  {
    key: "lifestyle",
    leaves: [
      "インテリア", "タオル", "ハンカチ", "マグカップ", "タンブラー", "グラス", "コースター", "プレート",
      "キッチン用品", "日用品", "バス用品", "クッション", "ブランケット", "傘", "マグネット", "スノードーム",
      "ハンディファン", "ネッククーラー", "ペット用品", "ケース", "スマホケース", "スマホリング", "充電グッズ",
    ],
  },
  { key: "figure", leaves: ["フィギュア", "おもちゃ", "プラモデル"] },
  { key: "other", leaves: ["その他", "セット"] },
];

/**
 * 表記ゆれの type タグ → 正しい type タグ（はっきり同じものだけ）。
 * マイグレーションで紐付けを移し、別名（tag_aliases）に登録する。移す前の画面でも同じ扱いになるよう、ここでも引き直す。
 */
export const TYPE_TAG_MERGES: Readonly<Record<string, string>> = {
  "tシャツ": "Tシャツ",
  "ブロマイド（生写真）": "ブロマイド",
};

/** type に入っていたが、本当は入手方法（source）のタグ。マイグレーションで source の同名タグへ移す */
export const TYPE_TAG_TO_SOURCE: Readonly<Record<string, string>> = {
  "ガチャ": "ガチャ",
};

/**
 * 入手方法（tags.category = 'source'）のよく使われるもの（多い順）。
 * 作品を選んでいない一覧は数百件ずつしか読まないので、そのときのチップはこれ＋読み込んだグッズに付いているもの。
 */
export const COMMON_SOURCES: readonly string[] = [
  "ライブ・ツアー", "受注販売", "ガチャ", "一番くじ", "プライズ", "キャンペーン特典", "誕生日限定", "コラボカフェ",
];

/** カテゴリ未設定（category IS NULL）で入っていた、グッズタイプのタグ → 統合先の type タグ */
export const NULL_TAG_TO_TYPE: Readonly<Record<string, string>> = {
  "アクリルスタンド": "アクリルスタンド",
  "クリアファイル": "クリアファイル",
  "ステッカー": "ステッカー",
  "タオル": "タオル",
  "バッグ": "バッグ",
  "フィギュア": "フィギュア",
  "ポーチ": "ポーチ",
  "マスコット": "マスコット",
  "ワッペン": "ワッペン",
  "tシャツ": "Tシャツ",
};

/**
 * カテゴリ未設定で入っていた、キャラクターのタグ → キャラ名。
 * キャラは作品ごとに別タグなので、紐付いたグッズの作品タグが1つに決まるときだけ移す（決まらなければ触らない）。
 */
export const NULL_TAG_TO_CHARACTER: Readonly<Record<string, string>> = {
  "うさぎ": "うさぎ",
  "ちいかわ": "ちいかわ",
  "ちいかわ（キャラクター名）": "ちいかわ",
  "ハチワレ": "ハチワレ",
  "モモンガ": "モモンガ",
};

/** 意味のない仮タグ（カテゴリ未設定のもの）。紐付けを外す（バックアップは残す） */
export const NULL_JUNK_TAGS: readonly string[] = ["なし"];

/**
 * はっきりしないので、マイグレーションでは触らないタグ（PR に一覧を載せ、持ち主の判断を待つ）。
 * テストで「どこにも二重に入っていない」ことを確かめるために持っている。
 */
export const LEFT_ALONE_TAGS: readonly string[] = [
  // カテゴリ未設定
  "ちいかわマスコット", // シリーズ名か、マスコット（type）か決めきれない
  "ちいかわ寿司", // コラボ（シリーズ / 入手方法）らしいが、どれか決めきれない
  "ホワイトラウンジ", // ツアー名（シリーズ / 入手方法）らしいが、どれか決めきれない
  "ミセスグリーンアップルa", // 作品名の打ち間違いらしいが、作品タグへ寄せてよいか決めきれない
  // type のうち、似ているが別物として残すもの
  "フォトカード", // カードの一種だが、トレカと分けて探したい人がいる
  "ペン", // 筆記具に含まれるが、名前が違うので統合しない
  "ラバー", // ラバスト・ラバーマットなどの総称。キーホルダーの下に置くだけ
  "アクスタンプ",
  "セット",
  "その他",
];

const LEAF_TO_GROUP: ReadonlyMap<string, GoodsGroupKey> = new Map(
  GOODS_GROUPS.flatMap((g) => g.leaves.map((leaf) => [leaf, g.key] as const))
);

/** type タグの名前 → 正しい小分類の名前（表記ゆれを直す。入手方法へ移すもの・未知のものはそのまま） */
export function canonicalTypeLeaf(name: string): string {
  return TYPE_TAG_MERGES[name] ?? name;
}

/**
 * type タグの名前 → 大分類。
 * 入手方法へ移すタグ（ガチャ）は null（カテゴリではない）。表に無い新しいタグは「その他」に入れて、絞り込みから漏らさない。
 */
export function groupOfTypeTag(name: string): GoodsGroupKey | null {
  if (name in TYPE_TAG_TO_SOURCE) return null;
  return LEAF_TO_GROUP.get(canonicalTypeLeaf(name)) ?? "other";
}

export function leavesOfGroup(key: GoodsGroupKey): readonly string[] {
  return GOODS_GROUPS.find((g) => g.key === key)?.leaves ?? [];
}

// ---------------------------------------------------------------------------
// カタログの絞り込みチップ（作品 → キャラ → カテゴリ → 入手方法）
// ---------------------------------------------------------------------------

/** 一覧のグッズのうち、絞り込みに使うところだけ（OfficialItem をそのまま渡せる形） */
export interface TaggedItem {
  item_tags?: ReadonlyArray<{ tags: { name: string; category?: string | null } | null }> | null;
}

export interface CatalogChipFilter {
  /** キャラ（character タグの名前） */
  character?: string | null;
  /** カテゴリの大分類 */
  group?: GoodsGroupKey | null;
  /** カテゴリの小分類（type タグの名前。group の中のもの） */
  leaf?: string | null;
  /** 入手方法（source タグの名前） */
  source?: string | null;
}

export const EMPTY_CHIP_FILTER: CatalogChipFilter = {};

export function isChipFilterActive(f: CatalogChipFilter): boolean {
  return !!(f.character || f.group || f.leaf || f.source);
}

interface ItemFacets {
  characters: Set<string>;
  groups: Set<GoodsGroupKey>;
  leaves: Set<string>;
  sources: Set<string>;
}

/** 1件のグッズのタグを、チップの軸ごとにまとめる */
export function itemFacets(item: TaggedItem): ItemFacets {
  const f: ItemFacets = { characters: new Set(), groups: new Set(), leaves: new Set(), sources: new Set() };
  for (const it of item.item_tags ?? []) {
    const tag = it?.tags;
    if (!tag?.name) continue;
    if (tag.category === "character") f.characters.add(tag.name);
    else if (tag.category === "source") f.sources.add(tag.name);
    else if (tag.category === "type") {
      const src = TYPE_TAG_TO_SOURCE[tag.name];
      if (src) {
        // マイグレーション前の「type のガチャ」も、入手方法のガチャとして扱う
        f.sources.add(src);
        continue;
      }
      const leaf = canonicalTypeLeaf(tag.name);
      f.leaves.add(leaf);
      const g = groupOfTypeTag(tag.name);
      if (g) f.groups.add(g);
    }
  }
  return f;
}

type Axis = "character" | "category" | "source";

function facetsMatch(f: ItemFacets, filter: CatalogChipFilter, skip?: Axis): boolean {
  if (skip !== "character" && filter.character && !f.characters.has(filter.character)) return false;
  if (skip !== "category") {
    if (filter.group && !f.groups.has(filter.group)) return false;
    if (filter.leaf && !f.leaves.has(filter.leaf)) return false;
  }
  if (skip !== "source" && filter.source && !f.sources.has(filter.source)) return false;
  return true;
}

export function matchesChipFilter(item: TaggedItem, filter: CatalogChipFilter): boolean {
  if (!isChipFilterActive(filter)) return true;
  return facetsMatch(itemFacets(item), filter);
}

export interface ChipCounts {
  characters: Map<string, number>;
  groups: Map<GoodsGroupKey, number>;
  leaves: Map<string, number>;
  sources: Map<string, number>;
}

/**
 * チップに出す件数。それぞれの軸は「ほかの軸の絞り込みをかけたうえで」数える（ファセット検索と同じ考え方）。
 * カテゴリの小分類は、選んでいる大分類の中だけを数える。
 */
export function countChipFacets(items: readonly TaggedItem[], filter: CatalogChipFilter): ChipCounts {
  const counts: ChipCounts = { characters: new Map(), groups: new Map(), leaves: new Map(), sources: new Map() };
  const bump = <K,>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const item of items) {
    const f = itemFacets(item);
    if (facetsMatch(f, filter, "character")) f.characters.forEach((c) => bump(counts.characters, c));
    if (facetsMatch(f, filter, "category")) {
      f.groups.forEach((g) => bump(counts.groups, g));
      if (filter.group && f.groups.has(filter.group)) {
        f.leaves.forEach((l) => {
          if (LEAF_TO_GROUP.get(l) === filter.group || (filter.group === "other" && !LEAF_TO_GROUP.has(l))) bump(counts.leaves, l);
        });
      }
    }
    if (facetsMatch(f, filter, "source")) f.sources.forEach((s) => bump(counts.sources, s));
  }
  return counts;
}
