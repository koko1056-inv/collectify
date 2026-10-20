// LINE通知・LINEログイン・Appleサインイン関連の文言。
// すべて機能フラグの裏にあり、フラグOFFなら画面には出ない。
export const lineConnect = {
  ja: {
    friendCard: {
      title: "推しの新作とログボのお知らせをLINEで受け取る",
      desc: "友だち追加すると、推しの新商品・交換の返事・デイリーログインのリマインドをLINEで受け取れます",
      cta: "LINEで受け取る",
      dismiss: "閉じる",
    },
    settings: {
      sectionTitle: "LINE連携",
      notifyLabel: "LINE通知",
      notifyDesc: "推しの新商品・交換の返事・デイリーログインのお知らせをLINEで受け取ります",
      connectCta: "LINEで友だち追加する",
      connected: "連携済み",
      linkIdentityTitle: "LINE / Apple を連携",
      linkIdentityDesc: "連携しておくと、パスワードを忘れてもログインできます",
      linkLine: "LINEを連携",
      linkApple: "Appleを連携",
      linkSuccess: "連携しました",
      linkFailed: "連携に失敗しました。しばらくしてからお試しください。",
      linkDisabled: "この操作は現在利用できません。しばらくしてからお試しください。",
    },
    login: {
      orDivider: "または",
      line: "LINEでログイン",
      apple: "Appleでサインイン",
      oauthFailedTitle: "ログインに失敗しました",
      oauthFailedDesc: "もう一度お試しください。",
    },
  },
  en: {
    friendCard: {
      title: "Get updates on your faves and daily rewards via LINE",
      desc: "Add us as a friend to get LINE alerts for new merch, trade replies, and daily login reminders",
      cta: "Get LINE alerts",
      dismiss: "Dismiss",
    },
    settings: {
      sectionTitle: "LINE connection",
      notifyLabel: "LINE notifications",
      notifyDesc: "Get LINE alerts for new merch, trade replies, and daily login reminders",
      connectCta: "Add as a LINE friend",
      connected: "Connected",
      linkIdentityTitle: "Link LINE / Apple",
      linkIdentityDesc: "Linking an account lets you sign in even if you forget your password",
      linkLine: "Link LINE",
      linkApple: "Link Apple",
      linkSuccess: "Linked",
      linkFailed: "Linking failed. Please try again later.",
      linkDisabled: "This isn't available right now. Please try again later.",
    },
    login: {
      orDivider: "or",
      line: "Continue with LINE",
      apple: "Continue with Apple",
      oauthFailedTitle: "Sign-in failed",
      oauthFailedDesc: "Please try again.",
    },
  },
} as const;
