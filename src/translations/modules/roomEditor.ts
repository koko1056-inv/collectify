/**
 * 翻訳モジュール: roomEditor
 * 対象: src/components/room2d, src/components/room3d
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする
 * （src/translations/index.ts の getTranslation を参照）。
 */
export const roomEditor = {
  ja: {
    explorer: {
      myRoom: "マイルームへ",
      searchPlaceholder: "ルームを検索...",
      tabTrending: "トレンド",
      tabFeatured: "注目",
      tabNew: "新着",
    },
  },
  en: {
    explorer: {
      myRoom: "My Room",
      searchPlaceholder: "Search rooms...",
      tabTrending: "Trending",
      tabFeatured: "Featured",
      tabNew: "New",
    },
  },
} as const;
