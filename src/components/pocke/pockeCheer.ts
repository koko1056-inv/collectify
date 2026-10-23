/**
 * ポッケの「やったね」。グッズを入れた・交換が進んだ・毎日来てくれた・買えた、などのときに
 * 画面のすみでポッケが跳ねて一言いう（Duolingo の正解の手ごたえ）。
 * どの画面から登録しても同じように出したいので、出す側はイベントを投げるだけにして、表示は PockeCheerHost（App に1つ）が持つ。
 */
export type PockeCheerKind =
  | "added" // グッズをコレクションに入れた
  | "addedMany" // まとめて入れた（n）
  | "arrived" // 予約していたグッズが届いた
  | "streak" // 毎日のログイン（n 日連続）
  | "purchased" // ポイントショップで買った
  | "tradeSent" // 交換を申し込んだ
  | "tradeAccepted" // 交換の申し込みを受けた
  | "tradeDone" // 交換のグッズを受け取った
  | "freezeUsed" // お休みの日を使って連続を守った（n）
  | "missionDone" // 今日のミッションを達成した（n = もらったポイント）
  | "wishlisted" // ほしいものに追加した
  | "preordered" // 予約した
  | "liked" // いいねした
  | "listedForTrade" // グッズを交換に出した
  | "unlistedForTrade" // グッズを交換から下げた
  | "guideDone"; // はじめてガイドの手順を達成した（n = もらったポイント、title = 手順名）

export interface PockeCheerDetail {
  kind: PockeCheerKind;
  /** 数（addedMany: 入れた数 / streak: 連続日数 / added・guideDone: もらったポイント） */
  n?: number;
  /** 吹き出しに入れる短い文字列（guideDone: 達成した手順名） */
  title?: string;
}

export const POCKE_CHEER_EVENT = "pocke:cheer";

export function pockeCheer(kind: PockeCheerKind, n?: number, title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PockeCheerDetail>(POCKE_CHEER_EVENT, { detail: { kind, n, title } }));
}
