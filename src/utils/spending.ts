/**
 * 推し活費（/spending）の集計。画面に依らない計算だけ。
 *
 * 数えるのは「買った値段」を入れたグッズ（いま持っているもの＋手放したもの）。
 * 月は買った日（無ければ登録した日）で決める。1個の値段 × 個数。
 */
import { parseYen } from "./preorders.ts";

/** 推し活費の画面の読み込みのキー（値段を直した画面から引き直す） */
export const spendingKey = (userId: string | null | undefined) => ["spending", userId] as const;

export interface SpendEntry {
  /** YYYY-MM-DD（日本時間） */
  date: string;
  amount: number;
  contentName: string | null;
}

export interface SpendRow {
  purchase_price: string | null;
  purchase_date: string | null;
  /** 登録した日時（ISO）。買った日が無いときに使う */
  created_at?: string | null;
  quantity?: number | null;
  content_name: string | null;
}

/** ISO の日時を日本時間の YYYY-MM-DD に */
export function jstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
}

export function toEntry(row: SpendRow): SpendEntry | null {
  const price = parseYen(row.purchase_price);
  if (price == null) return null;
  const date = row.purchase_date || (row.created_at ? jstDate(row.created_at) : null);
  if (!date) return null;
  return { date, amount: price * Math.max(1, row.quantity ?? 1), contentName: row.content_name?.trim() || null };
}

/** today（YYYY-MM-DD）を含む直近 n か月の YYYY-MM（古い順） */
export function lastMonths(today: string, n: number): string[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export interface MonthTotal {
  key: string;
  total: number;
  count: number;
}

export function monthlyTotals(entries: SpendEntry[], today: string, n = 12): MonthTotal[] {
  const keys = lastMonths(today, n);
  const map = new Map(keys.map((k) => [k, { key: k, total: 0, count: 0 }]));
  for (const e of entries) {
    const row = map.get(e.date.slice(0, 7));
    if (row) {
      row.total += e.amount;
      row.count += 1;
    }
  }
  return keys.map((k) => map.get(k)!);
}

export function totalIn(entries: SpendEntry[], prefix: string): number {
  return entries.reduce((sum, e) => (e.date.startsWith(prefix) ? sum + e.amount : sum), 0);
}

export interface WorkTotal {
  /** null は作品なし、"__other" はそれ以外のまとめ */
  name: string | null;
  total: number;
}

/** その年の作品ごとの合計（多い順）。limit を超えた分は「そのほか」にまとめる */
export function byWork(entries: SpendEntry[], year: string, limit = 5): WorkTotal[] {
  const map = new Map<string | null, number>();
  for (const e of entries) {
    if (!e.date.startsWith(year)) continue;
    map.set(e.contentName, (map.get(e.contentName) ?? 0) + e.amount);
  }
  const sorted = [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, w) => s + w.total, 0);
  return [...head, { name: "__other", total: rest }];
}
