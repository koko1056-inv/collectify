/**
 * 画面の中に「うまく読み込めなかったみたい…」（QueryErrorState）が出ている数。
 * その画面ではもうポッケがその場で「もう一度読み込む」を出しているので、
 * 左下の PockeLoadHost は同じことを重ねて言わない。
 */
let inlineErrors = 0;
const listeners = new Set<() => void>();

export function subscribeInlineLoadErrors(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const inlineLoadErrorCount = () => inlineErrors;

/** QueryErrorState が出ているあいだ呼ぶ。戻り値で取り消す */
export function registerInlineLoadError() {
  inlineErrors += 1;
  listeners.forEach((l) => l());
  return () => {
    inlineErrors -= 1;
    listeners.forEach((l) => l());
  };
}
