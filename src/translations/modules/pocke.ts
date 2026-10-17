/**
 * 翻訳モジュール: pocke
 * 対象: ガイド役のカンガルー「ポッケ」のセリフ（最初のあいさつ・コレクション画面のおすすめ・ひさしぶりのあいさつ）
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする。
 */
export const pocke = {
  ja: {
    name: "ポッケ",
    welcome: {
      hello: "はじめまして！",
      intro: "ぼく、ポッケ。",
      desc: "きみの推しグッズ、ぜんぶこのお腹の袋にしまっておくね。まずは呼び名を教えて！",
      niceToMeet: "{name}さん、よろしくね！",
    },
    onboarding: {
      interestsDesc: "選んだ作品のグッズを、ぼくがおすすめするね！",
      starterDesc: "タップしたグッズは、ぼくの袋にしまうよ。",
      starter1: "1こ入った！ その調子！",
      starterAlmost: "いいね！ あと{n}つで完成度が見えるよ",
      starterGoal: "やった！ 完成度が見えてきたよ！",
      starterMany: "{n}こ入った！ 袋がにぎやかになってきた！",
    },
    tip: {
      label: "ポッケのおすすめ",
      releases: "推しの新着が{n}件出てるよ！ のぞいてみる？",
      releasesCta: "新着を見る",
      care: "「{name}」のお世話、今日はまだだよ。なでてあげよう！",
      careCta: "推しの部屋へ",
      photo: "今日の推しフォト、まだ撮ってないよ。1枚撮ってみる？",
      photoCta: "撮りに行く",
      later: "あとで",
    },
    cheer: {
      added1: "袋に入った！ ナイス！",
      added2: "いいグッズ！ 大事にしまっておくね",
      added3: "コレクションが増えたね！",
      addedMany: "{n}こまとめて入った！ 袋がパンパン！",
      arrived: "届いたね！ おかえり、推しグッズ！",
    },
    welcomeBack: {
      title: "{n}日ぶり…さみしかったよ",
      withNew: "そのあいだに推しの新着が{n}件出てたよ。",
      noNew: "またいっしょにグッズを集めよう！",
      ctaNew: "新着を見に行く",
      ctaCollection: "コレクションを見る",
      later: "あとで",
    },
  },
  en: {
    name: "Pocke",
    welcome: {
      hello: "Hi there!",
      intro: "I'm Pocke.",
      desc: "I'll keep all your fave goods safe in my pouch. First, what should I call you?",
      niceToMeet: "Nice to meet you, {name}!",
    },
    onboarding: {
      interestsDesc: "I'll recommend goods from the works you pick!",
      starterDesc: "Whatever you tap goes into my pouch.",
      starter1: "One in! Keep it up!",
      starterAlmost: "Nice! {n} more to see your progress",
      starterGoal: "Yay! Your progress is showing!",
      starterMany: "{n} in! My pouch is getting full!",
    },
    tip: {
      label: "Pocke's pick",
      releases: "{n} new items from your faves! Want a peek?",
      releasesCta: "See what's new",
      care: "You haven't looked after \"{name}\" today. Give them a pat!",
      careCta: "Go to the room",
      photo: "No fave photo yet today. Take one?",
      photoCta: "Take a photo",
      later: "Later",
    },
    cheer: {
      added1: "In the pouch! Nice!",
      added2: "Great pick! I'll keep it safe",
      added3: "Your collection grew!",
      addedMany: "{n} at once! My pouch is stuffed!",
      arrived: "It arrived! Welcome home, fave goods!",
    },
    welcomeBack: {
      title: "{n} days… I missed you",
      withNew: "{n} new items from your faves came out while you were away.",
      noNew: "Let's keep collecting together!",
      ctaNew: "See what's new",
      ctaCollection: "Open my collection",
      later: "Later",
    },
  },
};
