/**
 * 翻訳モジュール: zukan
 * 対象: カタログ（/search）の図鑑表示（作品の所持率・未所持だけ・シリーズ別まとめ・発売年・発売日順）
 *
 * ja と en は同じキー構造にすること。
 */
export const zukan = {
  ja: {
    progress: {
      title: "{content} の所持率",
      count: "{owned} / {total}",
      percent: "{n}%",
      totalOnly: "{content} は全 {total} 件",
      loading: "所持率を数えています…",
      complete: "コンプしてる！ぼくもうれしいな",
      left: "あと {n} 個でコンプ",
      breakdown: "内訳",
      hideBreakdown: "内訳を閉じる",
      series: "シリーズ",
      character: "キャラ",
      type: "種類",
      noBreakdown: "まだ分けられるタグが無いみたい",
      showMore: "もっと見る（あと {n}）",
      rowCount: "{owned}/{total}",
    },
    guest: {
      nudge: "登録すると、持っているグッズの数と所持率がわかるよ",
      cta: "無料で登録する",
    },
    filter: {
      missingOnly: "未所持だけ",
      missingLoginRequired: "ログインすると使えるよ",
      viewList: "一覧",
      viewSeries: "シリーズ別",
      viewLabel: "表示",
      yearAll: "すべての年",
      year: "{year}年",
      yearCount: "{year}年 {n}",
      yearLabel: "発売年",
      partialHint: "読み込んだ分だけを数えています",
    },
    series: {
      owned: "{owned}/{total} 所持",
      complete: "コンプ",
      noSeries: "シリーズなし",
      showMoreGroups: "シリーズをもっと見る（あと {n}）",
      showAllItems: "このシリーズを全部見る（{n}件）",
      ownedBadge: "所持",
      allMissingDone: "未所持はもう無いよ。ぜんぶ持ってるね！",
    },
    sort: {
      releaseDesc: "発売が新しい順",
      releaseAsc: "発売が古い順",
    },
  },
  en: {
    progress: {
      title: "{content} completion",
      count: "{owned} / {total}",
      percent: "{n}%",
      totalOnly: "{content}: {total} items",
      loading: "Counting your collection…",
      complete: "You've got them all! I'm so happy!",
      left: "{n} more to complete",
      breakdown: "Breakdown",
      hideBreakdown: "Hide breakdown",
      series: "Series",
      character: "Characters",
      type: "Types",
      noBreakdown: "No tags to group by yet",
      showMore: "Show more ({n} more)",
      rowCount: "{owned}/{total}",
    },
    guest: {
      nudge: "Sign up and I'll show how many of these you own!",
      cta: "Sign up free",
    },
    filter: {
      missingOnly: "Missing only",
      missingLoginRequired: "Log in to use this",
      viewList: "List",
      viewSeries: "By series",
      viewLabel: "View",
      yearAll: "All years",
      year: "{year}",
      yearCount: "{year} {n}",
      yearLabel: "Release year",
      partialHint: "Counting only what's loaded so far",
    },
    series: {
      owned: "{owned}/{total} owned",
      complete: "Complete",
      noSeries: "No series",
      showMoreGroups: "Show more series ({n} more)",
      showAllItems: "Show all in this series ({n})",
      ownedBadge: "Owned",
      allMissingDone: "Nothing missing — you own them all!",
    },
    sort: {
      releaseDesc: "Release date (newest)",
      releaseAsc: "Release date (oldest)",
    },
  },
};
