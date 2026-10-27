/**
 * カタログ（/search）を「図鑑」として見るための小さな計算。
 *  - 作品の所持率（コンプ率）と、シリーズ・キャラ・種類ごとの内訳
 *  - シリーズごとにまとめる（「3/8 所持」）
 *  - 発売年で分ける・絞る、発売日で並べる
 *
 * scripts/test-zukan.mjs から直接 import するので、@/ のエイリアスや React を使わないこと。
 */

export type CompletionKind = "work" | "series" | "character" | "type";

/** get_catalog_completion の 1 行と同じ形。 */
export interface CompletionRow {
  kind: CompletionKind;
  label: string;
  owned: number;
  total: number;
}

export interface CompletionSummary {
  work: CompletionRow | null;
  series: CompletionRow[];
  character: CompletionRow[];
  type: CompletionRow[];
}

/** item_tags の形（useOfficialItems の SELECT と同じ）。 */
export interface ZukanItemLike {
  id: string;
  release_date?: string | null;
  item_tags?: { tags?: { name?: string | null; category?: string | null } | null }[] | null;
}

const PLACEHOLDERS = new Set(["", "なし", "none", "n/a"]);

function cleanName(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return PLACEHOLDERS.has(v.toLowerCase()) ? null : v;
}

/**
 * 所持率（%）。切り捨てにして、1 個でも足りなければ 100% と出さない（99.6% を 100% と見せない）。
 * 1 個でも持っていれば 1% 以上にする（0% と出すと「持っていない」と読めてしまう）。
 */
export function completionPercent(owned: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const o = Math.max(0, Math.min(owned, total));
  if (o >= total) return 100;
  if (o === 0) return 0;
  return Math.min(99, Math.max(1, Math.floor((o / total) * 100)));
}

export function isComplete(owned: number, total: number): boolean {
  return total > 0 && owned >= total;
}

/** RPC の行（または computeCompletionRows の結果）を、作品全体と内訳（多い順）に分ける。 */
export function summarizeCompletion(rows: CompletionRow[]): CompletionSummary {
  const out: CompletionSummary = { work: null, series: [], character: [], type: [] };
  for (const r of rows) {
    const row = { ...r, owned: Number(r.owned) || 0, total: Number(r.total) || 0 };
    if (row.kind === "work") out.work = row;
    else if (row.kind === "series" || row.kind === "character" || row.kind === "type") out[row.kind].push(row);
  }
  const byTotal = (a: CompletionRow, b: CompletionRow) =>
    b.total - a.total || b.owned - a.owned || a.label.localeCompare(b.label, "ja");
  out.series.sort(byTotal);
  out.character.sort(byTotal);
  out.type.sort(byTotal);
  return out;
}

/**
 * 手元にあるグッズ一覧から、RPC と同じ形の行を作る。
 * RPC（get_catalog_completion）がまだ本番に無い・失敗したときの代わりに使う。
 * 数え方は RPC と同じ: 同じ名前のタグは 1 つにまとめ、1 つのグッズは 1 回だけ数える。
 */
export function computeCompletionRows(
  items: ZukanItemLike[],
  ownedIds: ReadonlySet<string> | null | undefined,
  workLabel: string
): CompletionRow[] {
  const owned = ownedIds ?? new Set<string>();
  const seenItem = new Set<string>();
  let workOwned = 0;
  let workTotal = 0;
  const groups = new Map<string, CompletionRow & { ids: Set<string> }>();
  for (const item of items) {
    if (seenItem.has(item.id)) continue;
    seenItem.add(item.id);
    const has = owned.has(item.id);
    workTotal += 1;
    if (has) workOwned += 1;
    for (const row of item.item_tags ?? []) {
      const category = row.tags?.category;
      if (category !== "series" && category !== "character" && category !== "type") continue;
      const name = cleanName(row.tags?.name);
      if (!name) continue;
      const key = `${category}\u0000${name}`;
      let g = groups.get(key);
      if (!g) {
        g = { kind: category, label: name, owned: 0, total: 0, ids: new Set() };
        groups.set(key, g);
      }
      if (g.ids.has(item.id)) continue;
      g.ids.add(item.id);
      g.total += 1;
      if (has) g.owned += 1;
    }
  }
  const rows: CompletionRow[] = [{ kind: "work", label: workLabel, owned: workOwned, total: workTotal }];
  for (const g of groups.values()) rows.push({ kind: g.kind, label: g.label, owned: g.owned, total: g.total });
  return rows;
}

// ---------------------------------------------------------------------------
// シリーズごとにまとめる
// ---------------------------------------------------------------------------

/** シリーズタグが無いグッズをまとめる箱のキー（表示名は画面側で翻訳する）。 */
export const NO_SERIES_KEY = "__no_series__";

export interface SeriesGroup<T> {
  key: string;
  /** シリーズ名。NO_SERIES_KEY の箱は空文字 */
  label: string;
  items: T[];
  owned: number;
  total: number;
  /** その箱でいちばん新しい発売日（YYYY-MM-DD）。並べ替えに使う */
  latestRelease: string | null;
}

/** グッズに付いたシリーズタグの名前（重複なし・付いた順）。 */
export function seriesNamesOf(item: ZukanItemLike): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of item.item_tags ?? []) {
    if (row.tags?.category !== "series") continue;
    const name = cleanName(row.tags?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * シリーズタグでまとめる。シリーズが 2 つ付いたグッズは両方の箱に入る（数え方は RPC と同じ）。
 * 箱の中は渡された順のまま（画面の並べ替えを崩さない）。
 * 箱の並びは「新しく出たシリーズが先」、同じなら多い順。シリーズ無しの箱は最後。
 */
export function groupBySeries<T extends ZukanItemLike>(
  items: T[],
  ownedIds?: ReadonlySet<string> | null
): SeriesGroup<T>[] {
  const owned = ownedIds ?? new Set<string>();
  const groups = new Map<string, SeriesGroup<T>>();
  const add = (key: string, label: string, item: T) => {
    let g = groups.get(key);
    if (!g) {
      g = { key, label, items: [], owned: 0, total: 0, latestRelease: null };
      groups.set(key, g);
    }
    g.items.push(item);
    g.total += 1;
    if (owned.has(item.id)) g.owned += 1;
    const d = item.release_date ?? null;
    if (d && (!g.latestRelease || d > g.latestRelease)) g.latestRelease = d;
  };
  for (const item of items) {
    const names = seriesNamesOf(item);
    if (names.length === 0) add(NO_SERIES_KEY, "", item);
    else for (const name of names) add(`s:${name.toLowerCase()}`, name, item);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === NO_SERIES_KEY) return 1;
    if (b.key === NO_SERIES_KEY) return -1;
    const da = a.latestRelease ?? "";
    const db = b.latestRelease ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return b.total - a.total || a.label.localeCompare(b.label, "ja");
  });
}

// ---------------------------------------------------------------------------
// 発売年・発売日
// ---------------------------------------------------------------------------

/** "2024-03-15" → 2024。読めなければ null。 */
export function releaseYear(date: string | null | undefined): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}/.exec((date ?? "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2999 ? y : null;
}

export interface YearBucket {
  year: number;
  count: number;
}

/** 発売年ごとの件数（新しい年が先）。発売日の無いグッズは数えない。 */
export function yearBuckets(items: ZukanItemLike[]): YearBucket[] {
  const map = new Map<number, number>();
  for (const item of items) {
    const y = releaseYear(item.release_date);
    if (y === null) continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
}

/** URL の ?year= を読む。おかしな値は null（絞り込まない）。 */
export function parseYearParam(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  return releaseYear(`${value}-01-01`);
}

export function filterByYear<T extends ZukanItemLike>(items: T[], year: number | null): T[] {
  if (year === null) return items;
  return items.filter((i) => releaseYear(i.release_date) === year);
}

/** 未所持だけ（ownedIds が無いとき＝ゲストや読み込み中は絞らない）。 */
export function filterMissing<T extends ZukanItemLike>(items: T[], ownedIds: ReadonlySet<string> | null | undefined): T[] {
  if (!ownedIds) return items;
  return items.filter((i) => !ownedIds.has(i.id));
}

/**
 * 発売日で比べる（desc = 新しい順）。発売日の無いものはどちらの順でも最後。
 * 同じ日なら登録の新しい順、それも同じなら id（並びが毎回変わらないように）。
 */
export function compareByRelease(
  a: ZukanItemLike & { created_at?: string | null },
  b: ZukanItemLike & { created_at?: string | null },
  dir: "asc" | "desc"
): number {
  const da = a.release_date ?? "";
  const db = b.release_date ?? "";
  if (da !== db) {
    if (!da) return 1;
    if (!db) return -1;
    return dir === "desc" ? (da < db ? 1 : -1) : da < db ? -1 : 1;
  }
  const ca = a.created_at ?? "";
  const cb = b.created_at ?? "";
  if (ca !== cb) return ca < cb ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
