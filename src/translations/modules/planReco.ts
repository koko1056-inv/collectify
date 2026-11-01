/**
 * 翻訳モジュール: planReco
 * 対象: サブスク（プレミアム / プレミアム+）のおすすめ
 *   - ウェルカムの最後のステップ（src/components/onboarding/PlanRecoStep.tsx）
 *   - アプリの中のやさしい提案（src/components/premium/PlanRecoHost.tsx）
 *   - ポイント不足の確認ダイアログの中の小さな案内（src/components/shop/SpendPointsDialog.tsx）
 *
 * 特典は実際にサーバーで効いているもの（src/lib/planLimits.ts の PLAN_PERKS）だけを書く。
 * 金額・pt・% は文言に直書きせず、PLAN_PERKS / PLAN_PRICES_JPY から差し込む。
 *
 * ja と en は同じキー構造にすること。
 */
export const planReco = {
  ja: {
    prices: "プレミアム ¥{premium}/月・プレミアム+ ¥{plus}/月。",
    perks: {
      pointsTitle: "毎月ポイントが届く",
      pointsDesc: "プレミアム {premium}pt／プレミアム+ {plus}pt",
      aiTitle: "AI生成がおトクに",
      aiDesc: "画像の編集・AIルーム・アバター・投稿画像が {premium}%オフ／{plus}%オフ",
      keepNote: "受け取ったポイントは、解約したあともそのまま使えます。",
    },
    onboarding: {
      title: "もっと楽しみたくなったら、プランもあるよ",
      desc: "無料のままでも、Collectify の機能はぜんぶ使えるよ。",
      perMonth: "¥{price}/月",
      monthlyPoints: "毎月 {n}pt",
      aiDiscount: "AI生成 {n}%オフ",
      suggested: "あなたに合いそう",
      seePlans: "プランをくわしく見る",
      stayFree: "無料のまま、はじめる",
      note: "プランはあとからポイントショップでいつでも見られます。",
      later: "あとで",
    },
    sheet: {
      lowBalanceTitle: "ポイント、のこり {n}pt になったね",
      lowBalanceDesc: "毎月ポイントが届くプランもあるよ。よかったら見てみてね。",
      insufficientTitle: "ポイントが足りなかったね",
      insufficientDesc: "毎月ポイントが届いて、AI生成も割引になるプランもあるよ。",
      milestoneTitle: "コレクション {n}個、おめでとう！",
      milestoneDesc: "これからもたくさん飾るなら、毎月ポイントが届くプランもあるよ。",
      activeDaysTitle: "いつも来てくれてありがとう！",
      activeDaysDesc: "Collectify をもっと楽しめるプランもあるよ。よかったら見てみてね。",
      seePlans: "プランを見てみる",
      later: "あとで",
      never: "今後はこのおすすめを表示しない",
      neverDone: "わかったよ。もうおすすめしないね",
    },
    inline: {
      text: "毎月ポイントが届くプランもあります",
      cta: "見てみる",
    },
  },
  en: {
    prices: "Premium ¥{premium}/mo · Premium+ ¥{plus}/mo.",
    perks: {
      pointsTitle: "Monthly points",
      pointsDesc: "Premium {premium}pt / Premium+ {plus}pt",
      aiTitle: "AI generation for less",
      aiDesc: "Image editing, AI rooms, avatars and post images {premium}% / {plus}% off",
      keepNote: "Points you've received stay yours even after you cancel.",
    },
    onboarding: {
      title: "Want to enjoy even more? There are plans too",
      desc: "Every Collectify feature works on the free plan.",
      perMonth: "¥{price}/mo",
      monthlyPoints: "{n}pt monthly",
      aiDiscount: "AI {n}% off",
      suggested: "Might suit you",
      seePlans: "See plan details",
      stayFree: "Continue for free",
      note: "You can check the plans anytime from the Point Shop.",
      later: "Later",
    },
    sheet: {
      lowBalanceTitle: "You're down to {n}pt",
      lowBalanceDesc: "There's a plan that sends you points every month, if you'd like.",
      insufficientTitle: "Not quite enough points",
      insufficientDesc: "There's a plan with monthly points and discounted AI generation.",
      milestoneTitle: "{n} items in your collection — congrats!",
      milestoneDesc: "If you'll keep collecting, there's a plan that sends you points every month.",
      activeDaysTitle: "Thanks for always stopping by!",
      activeDaysDesc: "There are plans to enjoy Collectify even more, if you're curious.",
      seePlans: "See plans",
      later: "Later",
      never: "Don't show this again",
      neverDone: "Got it. I won't suggest it again",
    },
    inline: {
      text: "There's also a plan with monthly points",
      cta: "Take a look",
    },
  },
};
