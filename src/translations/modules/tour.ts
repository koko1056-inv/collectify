/**
 * 翻訳モジュール: tour
 * 対象: 画面ごとのスポットライト型操作ガイド（src/components/onboarding/）
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする
 * （src/translations/index.ts の getTranslation を参照）。
 *
 * 文章の方針: 1歩=1動作。機能の名前ではなく「何ができるか」を書く。
 */
export const tour = {
  ja: {
    // 説明するのは案内役のポッケ（カンガルー）。一人称は「ぼく」、短く、語りかける口調にそろえる
    a11yLabel: "ポッケの使い方ガイド",
    next: "次へ",
    done: "はじめる",
    skip: "閉じる",
    tapIt: "押してみて",
    progress: "{current} / {total}",
    disableAll: "ガイドをすべて表示しない",
    replay: "この画面の使い方をもう一度見る",
    replayAll: "使い方ガイドをもう一度表示する",
    replayDone: "ガイドをリセットしました。各画面を開くともう一度表示されます。",

    collection: {
      nav: {
        title: "ここがきみの棚だよ！",
        body: "下のタブは左から コレクション / 交換 / 追加 / みんな / マイページ。まん中の丸いボタンから、いつでもグッズを入れられるよ。",
        // PC など広い画面では下タブが無く、同じ並びが画面上のメニューになる
        bodyWide: "上のメニューは左から コレクション / 交換 / 追加 / みんな / マイページ。「追加」から、いつでもグッズを入れられるよ。",
      },
      checklist: {
        title: "まずはここを順番にやってみよう",
        body: "やることが順番に並んでるよ。1つ終わるたびにポイントがもらえて、AI生成やコレクション枠に使えるんだ。",
      },
      add: {
        title: "グッズを1つ入れてみよう！",
        body: "ここから追加できるよ。写真を撮る・一覧から選ぶ・手入力の3つから選べるんだ。押してみて！",
      },
    },

    quickAdd: {
      capture: {
        title: "きれいに撮らなくて大丈夫！",
        body: "グッズを写すと、AIが名前・作品・値段を読み取って下書きにするよ。外れてもあとで直せるから、まずは1枚撮ってみて。",
      },
      escape: {
        title: "手元に無いときはこっち",
        body: "いまグッズが手元に無ければ、一覧から選ぶか手入力でも登録できるよ。1つ入れておくと、部屋づくりや交換がすぐ使えるんだ。",
      },
    },

    trade: {
      how: {
        title: "交換は2つそろうと始まるよ",
        body: "「ほしいもの」と「交換に出せるもの」の両方があると相手が見つかるんだ。ダブってるグッズを1つ出すだけで十分だよ。",
      },
      openOffer: {
        title: "まずはここを押してみて",
        body: "押すと、持ってるグッズが並ぶ画面が開くよ。",
      },
      offer: {
        title: "出すものはここで選ぶよ",
        body: "持ってるグッズが写真つきで並ぶから、交換に出すものをタップして選んでね。押してみて！",
      },
    },

    search: {
      input: {
        title: "作品名やグッズ名で探せるよ",
        body: "「アクスタ」みたいなざっくりした言葉でも大丈夫。公式カタログにあるものはタップするだけで登録できるんだ。",
      },
      results: {
        title: "見つけたらタップで追加！",
        body: "持ってるものは棚へ、まだ持ってないものはほしいものリストへ入れられるよ。価格の目安もいっしょに出るんだ。",
      },
    },

    aiRooms: {
      intro: {
        title: "AIが「推しの部屋」を描くよ",
        body: "登録したグッズを飾った部屋を、画像で作るんだ。棚がからっぽでも、雰囲気から作れるよ。",
      },
      generate: {
        title: "はじめては無料で試せるよ",
        body: "テーマを選んで作るだけ。できた部屋はプロフィールに飾ったり、みんなに見せたりできるよ。",
      },
    },

    explore: {
      tabs: {
        title: "みんなの楽しみがここに集まるよ",
        body: "今週のお題・新着の投稿・推しの部屋・AI作品・人気のユーザーを少しずつ並べてるんだ。「すべて」で一覧が開くよ。",
      },
      feed: {
        title: "気になったらワンタップで反応！",
        body: "「持ってる！」「ほしい」「尊い」は押すだけ。同じグッズを持ってる人に届いて、話すきっかけになるよ。",
      },
    },

    guide: {
      profile: { title: "プロフィールを整えよう", body: "ここからアイコン・名前・自己紹介を設定できるよ。押してみて！" },
      firstItem: { title: "最初のグッズを入れよう！", body: "この＋から、写真を撮るか一覧から選んで登録できるよ。" },
      favorites: { title: "推しグッズを選ぼう", body: "ここを押して、いちばん好きなグッズを5つまで選んでね。順位つきでマイページに飾られて、推しの部屋で育てられるよ。" },
      favoritesDecorate: { title: "置いたら保存しよう", body: "グッズを部屋にドラッグして置いたら、ここを押して保存してね。保存すれば達成だよ。" },
      wishlist: { title: "ほしいものを追加しよう", body: "気になるグッズを開いて「ほしい」を押すと、ほしいものリストに入るよ。交換相手も見つかりやすくなるんだ。" },
      aiRoom: { title: "AIで推しルームを作ろう", body: "ここから、コレクションのグッズを並べた部屋をAIが描くよ。はじめては無料！" },
      avatar: { title: "AIアバターを作ろう", body: "ここから、写真や好きなイメージをもとにAIがアバターを作るよ。はじめては無料！" },
      follow: { title: "気になる人をフォローしよう", body: "同じ推しの人や、たくさん集めてる人のプロフィールを開いて「フォロー」を押してね。" },
      tradeOffer: { title: "交換に出すグッズを選ぼう", body: "ここから、ダブってるグッズなどを交換に出せるよ。出すと交換相手が見つかるようになるんだ。" },
      bookmark: { title: "気に入ったAI作品を保存しよう", body: "みんなのAI作品を開いて、しおりのボタンで保存できるよ。" },
      interests: { title: "推しの作品を選ぼう", body: "ここで推しの作品を選ぶと、その作品の新商品やコンプの的が出てくるようになるよ。" },
      firstItemFlow: { title: "グッズを入れよう！", body: "この＋から、写真を撮るか一覧から選んで登録できるよ。一覧ではシリーズをまとめて選べるんだ。" },
      goal: { title: "集めるものを決めよう", body: "コンプまでのカードの☆を押すと、そのシリーズやキャラが「集めるもの」になって、いちばん上に並ぶよ。" },
      tradeFlow: { title: "交換に出すグッズを選ぼう", body: "ここから、ダブってるグッズを交換に出せるよ。上の「X で探す」からは、譲・求の画像も作れるんだ。" },
    },
    me: {
      tabs: {
        title: "ここがきみのマイページ",
        body: "投稿・ほしいもの・保存・AI作品がここにまとまってるよ。右上の歯車から設定も開けるんだ。",
      },
    },
    myRoom: {
      main: {
        title: "ここがみんなに見えるきみの部屋",
        body: "選んだ部屋とアバターがプロフィールに出るよ。設定した内容はほかの人からも見えるから気をつけてね。",
      },
    },

    pointShop: {
      balance: {
        title: "ポイントの残高だよ",
        body: "やることリストを進めたり、友だちを招待したりすると増えるよ。",
      },
      items: {
        title: "枠やAI生成に使えるよ",
        body: "コレクションの登録上限を増やしたり、AI生成の回数を足したりできるんだ。",
      },
    },
    oshiRoom: {
      room: {
        title: "ここがきみの推しの部屋！",
        body: "推しグッズを写真のまま額縁やアクスタ台に入れて飾れるよ。グッズをタップすると、なでる・みがく・撮る・プレゼントでお世話できるんだ。",
      },
      decorate: {
        title: "模様替えしてみよう",
        body: "家具やグッズを指で動かして、好きな部屋にできるよ。季節のセットはポイントショップで手に入るんだ。",
      },
    },
  },

  en: {
    a11yLabel: "Screen walkthrough",
    next: "Next",
    done: "Start",
    skip: "Close",
    tapIt: "Tap it",
    progress: "{current} / {total}",
    disableAll: "Don't show any guides",
    replay: "Show this screen's walkthrough again",
    replayAll: "Show the walkthroughs again",
    replayDone: "Guides reset. They'll appear again as you open each screen.",

    collection: {
      nav: {
        title: "This is your shelf",
        body: "Five tabs along the bottom: Collection, Trade, Add, People and Me. The round button in the middle adds goods at any time.",
        bodyWide: "Five items in the menu at the top: Collection, Trade, Add, People and Me. Use \"Add\" to add goods at any time.",
      },
      checklist: {
        title: "Start by working through this",
        body: "Tasks are listed in order. Each one you finish earns points you can spend on AI generation or extra collection slots.",
      },
      add: {
        title: "Let's register one item",
        body: "Add items from here: take a photo, pick from the catalog, or type it in. Give it a tap.",
      },
    },

    quickAdd: {
      capture: {
        title: "It doesn't need to be a good photo",
        body: "Shoot the item and AI reads its name, series and price into a draft. You can fix anything it gets wrong, so just take one shot.",
      },
      escape: {
        title: "Nothing on hand right now?",
        body: "You can pick from the catalog or type it in instead. Having one item registered is what makes rooms and trading usable.",
      },
    },

    trade: {
      how: {
        title: "A trade needs two halves",
        body: "You'll find partners once you have both something you want and something you can offer. One spare item is enough.",
      },
      openOffer: {
        title: "Tap here first",
        body: "This opens the screen where your goods are listed.",
      },
      offer: {
        title: "Choose what you offer here",
        body: "Your goods are shown with photos, so you can tap the ones you want to put up for trade. Give it a tap.",
      },
    },

    search: {
      input: {
        title: "Search by series or item name",
        body: "Rough words like \"acrylic stand\" work fine. Anything in the official catalog can be registered with a single tap.",
      },
      results: {
        title: "Tap to add what you find",
        body: "Put what you own on your shelf, and what you don't into your wishlist. Ballpark prices are shown alongside.",
      },
    },

    aiRooms: {
      intro: {
        title: "AI builds your fan room",
        body: "It generates an image of a room decorated with the items you've registered. It works even with an empty shelf.",
      },
      generate: {
        title: "Your first one is free",
        body: "Pick a theme and generate. You can display the result on your profile or share it with everyone.",
      },
    },

    explore: {
      tabs: {
        title: "Everything from everyone, on one screen",
        body: "This week's theme, new posts, oshi rooms, AI creations and popular users, a few of each. Tap \"See all\" to open the full list.",
      },
      feed: {
        title: "React with one tap",
        body: "\"I have it!\", \"Want\" and \"Precious\" are one tap. People who own the same goods get notified, which starts conversations.",
      },
    },

    guide: {
      profile: { title: "Set up your profile", body: "Set your icon, name and bio here. Give it a tap." },
      firstItem: { title: "Add your first goods", body: "Tap + to take a photo or pick from the catalog." },
      favorites: { title: "Choose your oshi goods", body: "Tap here and choose up to 5 goods you love most. They're shown ranked on your page, and you can raise them in your Oshi Room." },
      favoritesDecorate: { title: "Save once you've placed one", body: "Drag a goods item into the room, then tap here to save. Saving completes this step." },
      wishlist: { title: "Add to your wishlist", body: "Open a goods item you like and tap \"Want\". It also helps you find trade partners." },
      aiRoom: { title: "Make an AI room", body: "Start here and AI draws a room filled with your goods. Your first one is free." },
      avatar: { title: "Make an AI avatar", body: "Start here and AI creates an avatar from your photo or an idea. Your first one is free." },
      follow: { title: "Follow people you like", body: "Open the profile of someone with the same fave, then tap \"Follow\"." },
      tradeOffer: { title: "Offer goods for trade", body: "Put duplicates up for trade here so trade partners can find you." },
      bookmark: { title: "Save AI works you like", body: "Open an AI work and save it with the bookmark button." },
      interests: { title: "Choose your fave series", body: "Pick the series you love here, and their new releases and completion targets will show up." },
      firstItemFlow: { title: "Add your goods", body: "Tap + to take a photo or pick from the catalog. In the catalog you can select a whole series at once." },
      goal: { title: "Choose what to complete", body: "Tap ☆ on a completion card to pin that series or character. It moves to the top." },
      tradeFlow: { title: "Offer goods for trade", body: "Put spares up for trade here. \"Find on X\" above also makes a have/want image." },
    },
    me: {
      tabs: {
        title: "This is your page",
        body: "Your posts, wishlist, saved items and AI works live here. Open settings from the gear at the top right.",
      },
    },
    myRoom: {
      main: {
        title: "This is your public room",
        body: "The room and avatar you choose appear on your profile, where other people can see them.",
      },
    },

    pointShop: {
      balance: {
        title: "Your point balance",
        body: "It grows as you work through the checklist and invite friends.",
      },
      items: {
        title: "Spend them on slots and AI",
        body: "Raise your collection limit or add more AI generation runs.",
      },
    },
    oshiRoom: {
      room: {
        title: "This is your oshi room",
        body: "Display your oshi goods as they are, in frames and acrylic stands. Tap one to pat, polish, photograph or give it a present.",
      },
      decorate: {
        title: "Try decorating",
        body: "Drag furniture and goods to make the room your own. Seasonal sets are in the point shop.",
      },
    },
  },
};
