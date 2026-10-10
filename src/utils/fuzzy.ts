/**
 * あいまい一致（画面の中だけで完結する小さな候補の絞り込み用）。
 * DB 側の search_norm() と同じ考え方で揃える:
 *   全角/半角・大文字小文字・カタカナ/ひらがな・記号・空白の違いを無視し、軽い打ち間違いも許す。
 * 数万件のカタログの検索はサーバー（search_official_items）で行う。ここはタグ一覧など数百〜数千件向け。
 */

/** 検索用に正規化する（NFKC → 小文字 → カタカナをひらがなに → 文字・数字・長音以外を除く） */
export function normalizeForSearch(input: string | null | undefined): string {
  if (!input) return "";
  const lowered = input.normalize("NFKC").toLowerCase();
  let out = "";
  for (const ch of lowered) {
    const code = ch.codePointAt(0)!;
    // カタカナ（ァ〜ヶ）をひらがなに
    const c = code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
    if (/[\p{L}\p{N}ー]/u.test(c)) out += c;
  }
  return out;
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const set = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) set.add(padded.slice(i, i + 3));
  return set;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  return (2 * common) / (a.size + b.size);
}

/**
 * text の中で query に一番近い部分との似かた（0〜1）。
 * 長い名前の一部だけ打った場合も当たるよう、query と同じ長さ前後の窓を滑らせて比べる。
 */
function windowSimilarity(nq: string, nt: string): number {
  const q = trigrams(nq);
  const lens = [nq.length - 1, nq.length, nq.length + 1].filter((n) => n >= 2);
  let best = 0;
  for (const len of lens) {
    if (len > nt.length) {
      best = Math.max(best, dice(q, trigrams(nt)));
      continue;
    }
    for (let i = 0; i + len <= nt.length; i++) {
      best = Math.max(best, dice(q, trigrams(nt.slice(i, i + len))));
      if (best >= 1) return 1;
    }
  }
  return best;
}

/**
 * query が text にどれくらい近いか（0〜1）。
 * 完全一致 1、前方一致 0.9、含む 0.75、それ以外は打ち間違い込みの似かた。
 */
export function fuzzyScore(query: string, text: string | null | undefined): number {
  const nq = normalizeForSearch(query);
  const nt = normalizeForSearch(text);
  if (nq.length === 0 || nt.length === 0) return 0;
  if (nt === nq) return 1;
  if (nt.startsWith(nq)) return 0.9;
  if (nt.includes(nq)) return 0.75;
  if (nq.length < 3) return 0;
  return windowSimilarity(nq, nt);
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
  /** 一番近かった表記（名前か別名） */
  matched: string;
}

/**
 * 候補の一覧から、query に近いものを近い順に返す。texts は 1 件につき複数の表記（名前・別名など）を渡せる。
 */
export function fuzzyRank<T>(
  query: string,
  items: readonly T[],
  texts: (item: T) => Array<string | null | undefined>,
  options: { min?: number; limit?: number } = {}
): FuzzyMatch<T>[] {
  const { min = 0.45, limit = 5 } = options;
  const out: FuzzyMatch<T>[] = [];
  for (const item of items) {
    let best = 0;
    let matched = "";
    for (const text of texts(item)) {
      const s = fuzzyScore(query, text);
      if (s > best) {
        best = s;
        matched = text ?? "";
      }
    }
    if (best >= min) out.push({ item, score: best, matched });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
