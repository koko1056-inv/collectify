/**
 * 「予約中」のグッズの並べ方と、金額の読み取り（画面に依らない計算だけ）。
 *
 * 予約は「ほしい → 予約した → 持ってる」の真ん中。発売日（＝届く目安）の月ごとに並べ、
 * 月ごとに「支払い予定」の合計を出す。発売日を過ぎたものは「届いた？」として先頭にまとめる。
 */

export interface PreorderLike {
  id: string;
  quantity: number;
  price: number | null;
  /** 発売日（YYYY-MM-DD）。カタログに無いときは null */
  releaseDate: string | null;
}

export interface PreorderGroup<T extends PreorderLike> {
  /** "due"（発売日を過ぎた）・"YYYY-MM"・"unknown"（発売日が分からない） */
  key: string;
  items: T[];
  /** 金額を入れた分の合計（個数を掛ける） */
  total: number;
  /** 金額が入っていない予約の数（合計に入っていない） */
  unpriced: number;
}

/** カタログの値段の文字列（"¥1,650"・"1650円"・"1,650円(税込)" など）から円の数を読む。読めなければ null */
export function parseYen(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/[,，]/g, "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
}

/** 発売日を過ぎた（今日を含む）か。今日は JST の YYYY-MM-DD で渡す */
export function isDue(p: Pick<PreorderLike, "releaseDate">, today: string): boolean {
  return !!p.releaseDate && p.releaseDate <= today;
}

/** 円の表記（¥1,650） */
export function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function lineTotal(p: Pick<PreorderLike, "price" | "quantity">): number {
  return (p.price ?? 0) * Math.max(1, p.quantity);
}

/** 発売日を過ぎたもの → 発売月の早い順 → 発売日が分からないもの、の順に分ける */
export function groupPreorders<T extends PreorderLike>(items: T[], today: string): PreorderGroup<T>[] {
  const byKey = new Map<string, T[]>();
  const sorted = [...items].sort((a, b) => (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999"));
  for (const p of sorted) {
    const key = isDue(p, today) ? "due" : p.releaseDate ? p.releaseDate.slice(0, 7) : "unknown";
    const list = byKey.get(key);
    if (list) list.push(p);
    else byKey.set(key, [p]);
  }
  const order = (k: string) => (k === "due" ? "0" : k === "unknown" ? "z" : `1${k}`);
  return [...byKey.entries()]
    .sort(([a], [b]) => order(a).localeCompare(order(b)))
    .map(([key, list]) => ({
      key,
      items: list,
      total: list.reduce((sum, p) => sum + lineTotal(p), 0),
      unpriced: list.filter((p) => p.price == null).length,
    }));
}

/** 「2026年11月」のような見出し用。key は YYYY-MM */
export function monthParts(key: string): { year: number; month: number } | null {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}
