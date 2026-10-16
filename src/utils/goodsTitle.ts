/**
 * グッズ名を、一覧や画像で読みやすい長さにする。
 *
 * カタログの名前は「ちいかわ 【予約】ちいかわ まじかる…【2027年2月下旬より順次発送予定…】」のように長い。
 * 【】の注記を外し、先頭で作品名が2回続いているときは1回にする（外して空になるなら元のまま）。
 * 作品名そのものは外さない: 「ちいかわ ぬいぐるみ」の「ちいかわ」はキャラクターの名前でもあるため。
 * 詳細画面では元の名前のまま見せる。
 */
export function shortGoodsTitle(title: string, contentName?: string | null): string {
  let s = title.replace(/【[^】]*】/g, " ").replace(/\s+/g, " ").trim();
  const head = contentName?.trim();
  if (head) {
    while (s.startsWith(`${head} ${head}`)) s = s.slice(head.length + 1).trim();
  }
  return s || title.trim();
}

/** 予約商品か（名前に【予約】などが付いている） */
export function isPreorderTitle(title: string): boolean {
  return /【[^】]*予約[^】]*】|^予約|［予約］|\[予約\]/.test(title);
}
