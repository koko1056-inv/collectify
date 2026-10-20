/**
 * 翻訳モジュール: catalogRequest
 * 対象: src/components/catalog/CatalogRequestButton, src/components/admin/CatalogRequestsManager
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする
 * （src/translations/index.ts の getTranslation を参照）。
 */
export const catalogRequest = {
  ja: {
    cta: "「{query}」を追加してほしい",
    sent: "リクエストしました",
    toastTitle: "リクエストしました！",
    toastDesc: "追加されたらお知らせするね",
    failed: "送れませんでした。時間をおいてもう一度お試しください",
    photoLink: "写真から登録する",
  },
  en: {
    cta: "Add \"{query}\" please",
    sent: "Requested",
    toastTitle: "Request sent!",
    toastDesc: "We'll let you know when it's added",
    failed: "Couldn't send. Please try again in a moment",
    photoLink: "Register from a photo",
  },
};
