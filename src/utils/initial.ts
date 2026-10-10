/** アバターの頭文字。表示名（なければユーザー名）の1文字目で、英字は大文字にそろえる */
export function getInitial(displayName?: string | null, username?: string | null): string {
  const name = (displayName || username || "").trim();
  const first = Array.from(name)[0] ?? "?";
  return first.toLocaleUpperCase();
}
