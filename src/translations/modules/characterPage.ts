/**
 * 翻訳モジュール: characterPage
 * 対象: キャラページ（/character/:tagId）と、そこへの入口（/search のキャラチップ・グッズ詳細のキャラタグ）
 *
 * ja と en は同じキー構造にすること。
 */
export const characterPage = {
  ja: {
    docTitle: "{name}（{content}）のグッズ | Collectify",
    noContent: "キャラ",
    kicker: "キャラ",
    contentLink: "{content} のカタログを見る",
    loading: "キャラのグッズを集めているよ…",
    loadFailed: "キャラの情報を読み込めなかったよ",
    notFoundTitle: "このキャラは見つからなかったよ",
    notFoundBody: "リンクが古いか、キャラのタグが整理されたのかも。カタログから探してみてね",
    toCatalog: "カタログを見る",
    emptyTitle: "このキャラのグッズはまだ無いみたい",
    emptyBody: "見つけたら登録してくれるとうれしいな",
    open: "キャラページ",
    openAria: "{name} のキャラページを開く",
  },
  en: {
    docTitle: "{name} ({content}) goods | Collectify",
    noContent: "Character",
    kicker: "Character",
    contentLink: "See the {content} catalog",
    loading: "Gathering this character's goods…",
    loadFailed: "Couldn't load this character",
    notFoundTitle: "I couldn't find this character",
    notFoundBody: "The link may be old, or the tag was tidied up. Try looking in the catalog!",
    toCatalog: "Open the catalog",
    emptyTitle: "No goods for this character yet",
    emptyBody: "If you find some, I'd love it if you added them",
    open: "Character page",
    openAria: "Open the character page for {name}",
  },
};
