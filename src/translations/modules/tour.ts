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
    a11yLabel: "画面の使い方ガイド",
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
        title: "ここがあなたの棚です",
        body: "下のタブは左から コレクション / 交換 / 追加 / みんな / マイルーム の5つです。中央の丸いボタンから、いつでもグッズを追加できます。",
      },
      checklist: {
        title: "まずはここを埋めていけばOK",
        body: "やることが順番に並んでいます。1つ終わるたびにポイントがもらえて、AI生成やコレクション枠に使えます。",
      },
      add: {
        title: "グッズを1つ登録してみましょう",
        body: "ここから追加できます。写真を撮る・一覧から選ぶ・手入力の3つから選べます。押してみてください。",
      },
    },

    quickAdd: {
      capture: {
        title: "きれいに撮らなくて大丈夫です",
        body: "グッズを写すと、AIが名前・作品・値段を読み取って下書きにします。読み取りが外れてもあとから直せるので、まずは1枚撮ってみてください。",
      },
      escape: {
        title: "手元に無いときはこちら",
        body: "いまグッズが手元に無ければ、一覧から選ぶか手入力でも登録できます。1つ入れておくと、部屋づくりや交換がすぐ使えるようになります。",
      },
    },

    trade: {
      how: {
        title: "交換は2つ揃うと成立します",
        body: "「ほしいもの」と「交換に出せるもの」の両方があると相手が見つかります。ダブっているグッズを1つ出すだけで十分です。",
      },
      offer: {
        title: "出すものをここで選びます",
        body: "持っているグッズが写真つきで並ぶので、交換に出すものをタップで選べます。押してみてください。",
      },
    },

    search: {
      input: {
        title: "作品名やグッズ名で探せます",
        body: "「アクリルスタンド」のようなざっくりした言葉でも大丈夫です。公式カタログにあるものはタップするだけで登録できます。",
      },
      results: {
        title: "見つけたらタップで追加",
        body: "持っているものは棚へ、まだ持っていないものはほしいものリストへ入れられます。価格の目安も一緒に表示されます。",
      },
    },

    aiRooms: {
      intro: {
        title: "AIが「推しの部屋」を作ります",
        body: "登録したグッズを使って、飾った状態の部屋を画像で生成します。棚に何もない状態でも雰囲気から作れます。",
      },
      generate: {
        title: "初回は無料で試せます",
        body: "テーマを選んで生成するだけ。できた部屋はプロフィールに飾ったり、みんなに公開したりできます。",
      },
    },

    explore: {
      tabs: {
        title: "みんなの投稿と、グッズ探し",
        body: "「投稿」では今週のお題や新着が見られます。「グッズ」では、そのグッズを誰が持っているか・交換できる人がいるかが分かります。",
      },
      feed: {
        title: "気になったらワンタップで反応",
        body: "「持ってる！」「ほしい」「尊い」は押すだけ。同じグッズを持っている人に届いて、会話のきっかけになります。",
      },
    },

    guide: {
      profile: { title: "プロフィールを整えよう", body: "ここからアイコン・名前・自己紹介を設定できます。押してみましょう。" },
      firstItem: { title: "最初のグッズを登録しよう", body: "この＋から、写真を撮るか一覧から選んでグッズを登録できます。" },
      favorites: { title: "お気に入りTOP5を選ぼう", body: "「編集」を押して、いちばん好きなグッズを5つまで選びます。マイページの目立つ場所に並びます。" },
      wishlist: { title: "ほしいものを追加しよう", body: "気になるグッズを開いて「ほしい」を押すと、ほしいものリストに入ります。交換相手も見つかりやすくなります。" },
      aiRoom: { title: "AIで推しルームを作ろう", body: "ここから、コレクションのグッズを並べた部屋をAIが描きます。初回は無料です。" },
      avatar: { title: "AIアバターを作ろう", body: "ここから、写真や好きなイメージをもとにAIがアバターを作ります。初回は無料です。" },
      follow: { title: "気になる人をフォローしよう", body: "同じ推しの人や、たくさん集めている人のプロフィールを開いて「フォロー」を押しましょう。" },
      tradeOffer: { title: "交換に出すグッズを選ぼう", body: "ここから、ダブっているグッズなどを交換に出せます。出すと交換相手が見つかるようになります。" },
      bookmark: { title: "気に入ったAI作品を保存しよう", body: "みんなのAI作品を開いて、しおりのボタンで保存できます。" },
    },
    me: {
      tabs: {
        title: "ここがあなたのマイページ",
        body: "投稿・ほしいもの・保存・AI作品がここにまとまっています。右上の歯車から設定を開けます。",
      },
    },
    myRoom: {
      main: {
        title: "ここが公開されるあなたの部屋",
        body: "選んだ部屋とアバターがプロフィールに表示されます。設定した内容は他の人からも見えます。",
      },
    },

    pointShop: {
      balance: {
        title: "ポイントの残高です",
        body: "やることリストを進めたり、友だちを招待したりすると増えます。",
      },
      items: {
        title: "枠やAI生成に使えます",
        body: "コレクションの登録上限を増やしたり、AI生成の回数を追加したりできます。",
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
        body: "Five tabs along the bottom: Collection, Trade, Add, People and My Room. The round button in the middle adds goods at any time.",
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
        title: "Posts from everyone, and goods search",
        body: "\"Posts\" shows this week's theme and new posts. \"Goods\" shows who owns an item and who is open to trading.",
      },
      feed: {
        title: "React with one tap",
        body: "\"I have it!\", \"Want\" and \"Precious\" are one tap. People who own the same goods get notified, which starts conversations.",
      },
    },

    guide: {
      profile: { title: "Set up your profile", body: "Set your icon, name and bio here. Give it a tap." },
      firstItem: { title: "Add your first goods", body: "Tap + to take a photo or pick from the catalog." },
      favorites: { title: "Pick your top 5", body: "Tap \"Edit\" and choose up to 5 favorite goods. They're shown prominently on your page." },
      wishlist: { title: "Add to your wishlist", body: "Open a goods item you like and tap \"Want\". It also helps you find trade partners." },
      aiRoom: { title: "Make an AI room", body: "Start here and AI draws a room filled with your goods. Your first one is free." },
      avatar: { title: "Make an AI avatar", body: "Start here and AI creates an avatar from your photo or an idea. Your first one is free." },
      follow: { title: "Follow people you like", body: "Open the profile of someone with the same fave, then tap \"Follow\"." },
      tradeOffer: { title: "Offer goods for trade", body: "Put duplicates up for trade here so trade partners can find you." },
      bookmark: { title: "Save AI works you like", body: "Open an AI work and save it with the bookmark button." },
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
  },
};
