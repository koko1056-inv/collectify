/**
 * 翻訳モジュール: catalogFilters
 * 対象: src/components/catalog/CatalogFilterChips（カタログの 作品 → キャラ → カテゴリ → 入手方法 の絞り込みチップ）
 *
 * groups のキーは src/lib/goodsTaxonomy.ts の GoodsGroupKey と同じにすること。
 */
export const catalogFilters = {
  ja: {
    label: "絞り込み",
    rows: {
      content: "作品",
      character: "キャラ",
      category: "カテゴリ",
      source: "入手方法",
    },
    all: "すべて",
    allInGroup: "{group}すべて",
    reset: "リセット",
    pickContentFirst: "作品を選ぶとキャラで絞れます",
    noCharacters: "この作品はキャラのタグがまだありません",
    countAria: "{n}件",
    groups: {
      acrylic: "アクスタ・アクリル",
      badge: "缶バッジ・ピンズ",
      plush: "ぬいぐるみ・マスコット",
      keychain: "キーホルダー",
      card: "カード・ブロマイド",
      media: "CD・映像・レコード",
      magazine: "雑誌",
      live: "うちわ・ペンライト",
      stationery: "文房具",
      fashion: "ファッション",
      lifestyle: "生活雑貨",
      figure: "フィギュア・おもちゃ",
      other: "その他",
    },
  },
  en: {
    label: "Filters",
    rows: {
      content: "Series",
      character: "Character",
      category: "Category",
      source: "Where to get",
    },
    all: "All",
    allInGroup: "All {group}",
    reset: "Reset",
    pickContentFirst: "Pick a series to filter by character",
    noCharacters: "No character tags for this series yet",
    countAria: "{n} items",
    groups: {
      acrylic: "Acrylic stands",
      badge: "Badges & pins",
      plush: "Plushies & mascots",
      keychain: "Keychains",
      card: "Cards & photos",
      media: "CDs, video & vinyl",
      magazine: "Magazines",
      live: "Fans & light sticks",
      stationery: "Stationery",
      fashion: "Fashion",
      lifestyle: "Home & lifestyle",
      figure: "Figures & toys",
      other: "Other",
    },
  },
};
