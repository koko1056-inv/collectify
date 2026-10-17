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
    corner: {
      aria: "ポッケと話す",
      ariaNews: "ポッケと話す（お知らせ{n}件）",
      honorific: "{name}さん",
      greet: {
        morning: "おはよう、{name}！",
        day: "こんにちは、{name}！",
        evening: "こんばんは、{name}！",
        night: "夜ふかしだね、{name}",
      },
      greetNoName: {
        morning: "おはよう！",
        day: "こんにちは！",
        evening: "こんばんは！",
        night: "夜ふかしだね",
      },
      trade: {
        myTurn: "きみの番の交換が{n}件あるよ！ 返事を待ってるみたい",
        offer: "ダブってるグッズを交換に出すと、相手が見つかりやすくなるよ",
        wish: "ほしいグッズを入れてくれたら、持ってる人を探してくるね",
      },
      explore: {
        prompt: "今週のお題は「#{tag}」！ 投稿してみる？",
      },
      me: {
        avatar: "アイコンを設定すると、みんなに覚えてもらいやすいよ",
        interests: "推しの作品を選ぶと、新商品が出たら教えてあげられるよ",
        oshi: "推しグッズをあと{n}つ選べるよ。推しの部屋に飾ろう！",
      },
      idle: {
        collection: {
          0: "今日はどのグッズを眺める？",
          1: "グッズをタップすると、思い出も残せるよ",
          2: "袋の中、にぎやかになってきたね！",
        },
        trade: {
          0: "交換は、チャットで相談してから決められるよ",
          1: "両想いの相手がいたら、ここに出てくるよ",
          2: "いい交換が見つかるといいね！",
        },
        explore: {
          0: "みんなの推しの部屋、のぞいてみる？",
          1: "気になる投稿には「持ってる！」で反応できるよ",
          2: "同じ推しの人、見つかるかも！",
        },
        me: {
          0: "ここはきみのページ。推しグッズを飾って自慢しよう！",
          1: "プロフィールはみんなから見えるよ",
          2: "今日もいっしょに集めようね！",
        },
      },
    },
    cheer: {
      added1: "袋に入った！ ナイス！",
      added2: "いいグッズ！ 大事にしまっておくね",
      added3: "コレクションが増えたね！",
      addedMany: "{n}こまとめて入った！ 袋がパンパン！",
      arrived: "届いたね！ おかえり、推しグッズ！",
      streak1: "{n}日連続！ 今日も来てくれてうれしい！",
      streak2: "おかえり！ {n}日連続だね",
      purchased: "やったー！ 大事に使ってね",
      tradeSent: "申し込んだよ！ いい返事が来るといいね",
      tradeAccepted: "交換が決まったね！ 発送もがんばろう",
      tradeDone: "交換成立！ 新しい推しグッズ、袋に入れておくね",
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
    corner: {
      aria: "Talk to Pocke",
      ariaNews: "Talk to Pocke ({n} new)",
      honorific: "{name}",
      greet: {
        morning: "Good morning, {name}!",
        day: "Hi, {name}!",
        evening: "Good evening, {name}!",
        night: "Up late, {name}?",
      },
      greetNoName: {
        morning: "Good morning!",
        day: "Hi there!",
        evening: "Good evening!",
        night: "Up late?",
      },
      trade: {
        myTurn: "{n} trades are waiting on you!",
        offer: "Offer a duplicate to find trade partners faster",
        wish: "Add goods you want and I'll find who has them",
      },
      explore: {
        prompt: "This week's theme is \"#{tag}\"! Want to post?",
      },
      me: {
        avatar: "Set an icon so everyone remembers you",
        interests: "Pick your fave works and I'll tell you about new releases",
        oshi: "You can pick {n} more fave goods to show off in your room!",
      },
      idle: {
        collection: {
          0: "Which goods will you admire today?",
          1: "Tap any goods to keep a memory with it",
          2: "My pouch is getting lively!",
        },
        trade: {
          0: "You can chat before agreeing to a trade",
          1: "Mutual matches will show up here",
          2: "Hope you find a great trade!",
        },
        explore: {
          0: "Want to peek at everyone's fave rooms?",
          1: "React to posts with \"I have it!\"",
          2: "You might find someone with the same fave!",
        },
        me: {
          0: "This is your page. Show off your fave goods!",
          1: "Your profile is visible to everyone",
          2: "Let's keep collecting together!",
        },
      },
    },
    cheer: {
      added1: "In the pouch! Nice!",
      added2: "Great pick! I'll keep it safe",
      added3: "Your collection grew!",
      addedMany: "{n} at once! My pouch is stuffed!",
      arrived: "It arrived! Welcome home, fave goods!",
      streak1: "{n} days in a row! So happy you're here!",
      streak2: "Welcome back! That's {n} days in a row",
      purchased: "Yay! Enjoy it!",
      tradeSent: "Request sent! Fingers crossed!",
      tradeAccepted: "It's a deal! Time to ship",
      tradeDone: "Trade complete! I'll tuck your new goods in my pouch",
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
