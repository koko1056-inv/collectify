// アプリの中の「やさしいお願い・おすすめ」のシート（あなたのことの案内・プランのおすすめ）を、
// 1回の起動で1つまでにする。2つ続けて出ると、お願いばかりされている感じになるため。
// 起動し直すと（このモジュールが読み直されると）また1つ出せる。間隔そのものは各ホストの決まり（planReco.ts 等）が持つ。

let usedBy: string | null = null;

/** このシートを出してよいか。よければ予約する（同じ id なら何度でも true） */
export function claimNudgeSlot(id: string): boolean {
  if (usedBy !== null && usedBy !== id) return false;
  usedBy = id;
  return true;
}

/**
 * いま画面に何か重なっているか（シート・ダイアログ・画面ガイドのスポットライト）。
 * スポットライト（SpotlightTour）は role="dialog" だが data-state を持たないので、role だけで見る。
 * Radix のシート・ダイアログは閉じると DOM から外れる（閉じる動きのあいだだけ data-state="closed" で残る）。
 * 同意のバナー（ConsentBanner）も role="dialog" なので、それが出ているあいだも待つ。
 */
export function isOverlayOpen(): boolean {
  return (
    typeof document !== "undefined" &&
    document.querySelector('[role="dialog"]:not([data-state="closed"]), [role="alertdialog"]:not([data-state="closed"])') !== null
  );
}

/** もう誰かが使ったか（出す前の下見用） */
export function isNudgeSlotFree(id: string): boolean {
  return usedBy === null || usedBy === id;
}
