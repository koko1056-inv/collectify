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
        body: "下のタブで5つの場所を行き来します。中央の丸いボタンがグッズ探し、右端があなたのプロフィールです。",
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
        body: "「欲しいもの」と「交換に出せるもの」の両方があると相手が見つかります。ダブっているグッズを1つ出すだけで十分です。",
      },
      offer: {
        title: "出すものをここで選びます",
        body: "持っているグッズが一覧で出るので、交換に出すものをスイッチで選べます。押してみてください。",
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
        title: "他の人のコレクションを見られます",
        body: "作品・部屋・ユーザーで切り替えられます。同じ推しの人を見つけたらフォローしておくと、新しい投稿が届きます。",
      },
      feed: {
        title: "気になったら保存",
        body: "部屋やAI作品はブックマークして後から見返せます。自分の部屋づくりの参考にしてください。",
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
        body: "The bottom tabs move you between five places. The round button in the middle finds goods; the far right is your profile.",
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
        body: "Your Goods are listed with a switch each, so you can pick what to put up for trade. Give it a tap.",
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
        title: "See other people's collections",
        body: "Switch between series, rooms and users. Follow people who like the same things and their new posts will reach you.",
      },
      feed: {
        title: "Save what catches your eye",
        body: "Bookmark rooms and AI works to revisit later, and use them as references for your own room.",
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
