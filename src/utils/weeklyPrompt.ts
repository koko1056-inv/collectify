/**
 * 週替わりの投稿お題。
 *
 * 「何を投稿すればいいか分からない」が投稿の最大の壁なので、
 * 今週のテーマを1つ示して、同じハッシュタグの投稿が1つの場所に集まるようにする。
 * 運営の手作業が要らないよう、週番号から決定的に選ぶ（サーバー不要・全員同じお題になる）。
 */

export interface WeeklyPrompt {
  /** ハッシュタグ（#は含まない） */
  tag: string;
  /** 翻訳キー（engage.prompts.<id>.title / hint） */
  id: string;
}

const PROMPTS: WeeklyPrompt[] = [
  { id: "newArrival", tag: "今日のお迎え" },
  { id: "bestPick", tag: "最推し自慢" },
  { id: "gachaLuck", tag: "ガチャ運報告" },
  { id: "carryWith", tag: "お守りグッズ" },
  { id: "firstGoods", tag: "初めて買ったグッズ" },
  { id: "complete", tag: "コンプ報告" },
  { id: "outing", tag: "推しと外出" },
  { id: "shrine", tag: "祭壇見せて" },
  { id: "colorMatch", tag: "推しカラー" },
  { id: "tradeWish", tag: "交換希望" },
];

/** 月曜始まりの「週の通し番号」。UTC基準で全員が同じ週になる。 */
export function weekIndex(date: Date = new Date()): number {
  // 1970-01-05 は月曜日
  const MONDAY_EPOCH = Date.UTC(1970, 0, 5);
  return Math.floor((date.getTime() - MONDAY_EPOCH) / (7 * 24 * 3600 * 1000));
}

export function getWeeklyPrompt(date: Date = new Date()): WeeklyPrompt {
  const n = PROMPTS.length;
  return PROMPTS[((weekIndex(date) % n) + n) % n];
}

/** お題の一覧（お題を選び直せるようにするため） */
export function getAllPrompts(): WeeklyPrompt[] {
  return PROMPTS;
}

/** 次のお題に切り替わるまでの日数（今日を含めて何日残っているか） */
export function daysLeftInWeek(date: Date = new Date()): number {
  const MONDAY_EPOCH = Date.UTC(1970, 0, 5);
  const dayMs = 24 * 3600 * 1000;
  const dayOfWeek = Math.floor((date.getTime() - MONDAY_EPOCH) / dayMs) % 7;
  return 7 - dayOfWeek;
}
