/**
 * ポッケの「やったね」。グッズをコレクションに入れたとき、画面のすみでポッケが跳ねて一言いう（Duolingo の正解の手ごたえ）。
 * どの画面から登録しても同じように出したいので、出す側はイベントを投げるだけにして、表示は PockeCheerHost（App に1つ）が持つ。
 */
export type PockeCheerKind = "added" | "addedMany" | "arrived";

export interface PockeCheerDetail {
  kind: PockeCheerKind;
  /** まとめて入れた数（addedMany） */
  n?: number;
}

export const POCKE_CHEER_EVENT = "pocke:cheer";

export function pockeCheer(kind: PockeCheerKind, n?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PockeCheerDetail>(POCKE_CHEER_EVENT, { detail: { kind, n } }));
}
