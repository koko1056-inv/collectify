/**
 * 「お迎えの記録」を、ユーザーに何も入力させずに作るための計算。
 *
 * お迎え日は、入力されていれば購入日(purchase_date)、無ければ登録日(created_at)を使う。
 * どちらも既に手元にあるデータなので、新しい入力は要らない。
 */

export interface DatedItem {
  id: string;
  created_at: string;
  purchase_date?: string | null;
}

/** お迎え日。購入日は日付だけ(YYYY-MM-DD)なので、ずれないよう端末のローカル日付として読む */
export function acquiredDate(item: DatedItem): Date {
  if (item.purchase_date) {
    const [y, m, d] = item.purchase_date.slice(0, 10).split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date(item.created_at);
}

export function acquiredTime(item: DatedItem): number {
  return acquiredDate(item).getTime();
}

export interface MonthGroup<T> {
  key: string; // "2026-10"
  year: number;
  month: number; // 1-12
  items: T[];
}

/** お迎え日の新しい順に並べ、月ごとにまとめる */
export function groupByMonth<T extends DatedItem>(items: T[]): MonthGroup<T>[] {
  const sorted = [...items].sort((a, b) => acquiredTime(b) - acquiredTime(a));
  const groups: MonthGroup<T>[] = [];
  for (const item of sorted) {
    const d = acquiredDate(item);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, year, month, items: [item] });
  }
  return groups;
}

const DAY = 24 * 3600 * 1000;
/** 「今ごろ」とみなす前後の日数。ぴったり同じ日だけだと、ほとんど出会えない */
const WINDOW_DAYS = 3;

export interface OnThisDay<T> {
  yearsAgo: number;
  /** 日付がぴったり同じ（「今日」と言ってよい） */
  exact: boolean;
  items: T[];
}

/**
 * 1年以上前の「今ごろ」にお迎えしたグッズ。
 * いちばん古い年を優先する（長く持っているほど思い出になる）。無ければ null。
 */
export function findOnThisDay<T extends DatedItem>(items: T[], now: Date = new Date()): OnThisDay<T> | null {
  const byYears = new Map<number, { items: T[]; exact: boolean }>();
  for (const item of items) {
    const d = acquiredDate(item);
    const yearsAgo = now.getFullYear() - d.getFullYear();
    if (yearsAgo < 1) continue;
    // 同じ月日を「今年」に置いたときの差で近さを測る（年またぎも拾う）
    const anniversary = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.abs(Math.round((anniversary.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY));
    if (diffDays > WINDOW_DAYS) continue;
    const entry = byYears.get(yearsAgo) ?? { items: [], exact: false };
    entry.items.push(item);
    if (diffDays === 0) entry.exact = true;
    byYears.set(yearsAgo, entry);
  }
  if (byYears.size === 0) return null;
  const yearsAgo = Math.max(...byYears.keys());
  const entry = byYears.get(yearsAgo)!;
  return { yearsAgo, exact: entry.exact, items: entry.items };
}
