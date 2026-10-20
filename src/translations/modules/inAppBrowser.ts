/**
 * 翻訳モジュール: inAppBrowser
 * 対象: src/components/pwa/InAppBrowserNotice
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする
 * （src/translations/index.ts の getTranslation を参照）。
 */
export const inAppBrowser = {
  ja: {
    title: "このままだと引き継がれません",
    desc: "このままだと、あとでSafariで開いたときにログインと袋の中身が引き継がれません。Safari（Androidは Chrome）で開いてから登録してね",
    lineTitle: "Safariで開くのがおすすめ",
    lineDesc: "LINEのアプリ内ブラウザのままでも登録できますが、Safariで開いたほうが、あとでログインや袋の中身がしっかり引き継がれます",
    dismiss: "閉じる",
    iosStep1: "右上（または右下）の「…」ボタンをタップ",
    iosStep2: "「ブラウザで開く」または「Safariで開く」を選ぶ",
    androidStep1: "右上の「⋮」ボタンをタップ",
    androidStep2: "「Chromeで開く」または「外部ブラウザで開く」を選ぶ",
    copyLink: "リンクをコピー",
    copied: "コピーしました",
    openChrome: "Chromeで開く",
  },
  en: {
    title: "This won't carry over later",
    desc: "If you stay here, your login and bag won't carry over when you later open Safari. Open this in Safari (Chrome on Android) before you sign up",
    lineTitle: "We recommend opening this in Safari",
    lineDesc: "You can sign up from inside the LINE browser, but opening it in Safari first makes sure your login and bag carry over properly later",
    dismiss: "Dismiss",
    iosStep1: "Tap the \"…\" button (top-right or bottom-right)",
    iosStep2: "Choose \"Open in Browser\" or \"Open in Safari\"",
    androidStep1: "Tap the \"⋮\" button (top-right)",
    androidStep2: "Choose \"Open in Chrome\" or \"Open in external browser\"",
    copyLink: "Copy link",
    copied: "Copied",
    openChrome: "Open in Chrome",
  },
};
