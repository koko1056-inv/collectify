import { getItemFacets, type FacetKind } from "@/utils/itemFacets";

/**
 * カタログ（公式グッズ）の一覧を、作品・タグで絞り込むための小さな道具。
 * 「一覧から選ぶ」で、グッズが多くても目的のものへ辿り着けるようにする。
 */

export interface CatalogItemLike {
  id: string;
  title: string;
  content_name?: string | null;
  item_tags?: { tags?: { name?: string | null; category?: string | null } | null }[] | null;
}

export type CatalogSelection = Partial<Record<FacetKind, string[]>>;

export interface CatalogFilterState {
  query: string;
  content: string | null;
  selection: CatalogSelection;
  hideOwned: boolean;
}

export const EMPTY_FILTER: CatalogFilterState = { query: "", content: null, selection: {}, hideOwned: false };

// グッズが1万件を超えても、入力のたびに全件のタグを組み直さないよう、グッズごとの計算結果を覚えておく。
// キーはグッズのオブジェクトそのもの（取得し直せば別のオブジェクトになるので、古い結果が残ることはない）。
const facetCache = new WeakMap<object, ReturnType<typeof getItemFacets>>();
const haystackCache = new WeakMap<object, string>();

/** 作品名は別枠で扱うので、ここではタグだけから作る（作品名をシリーズに混ぜない）。 */
export function catalogFacets(item: CatalogItemLike) {
  const hit = facetCache.get(item);
  if (hit) return hit;
  const facets = getItemFacets({ official_items: { content_name: null, item_tags: item.item_tags ?? [] } });
  facetCache.set(item, facets);
  return facets;
}

/** キーワード検索の対象になる文字列（小文字）。 */
function haystack(item: CatalogItemLike): string {
  const hit = haystackCache.get(item);
  if (hit !== undefined) return hit;
  const facets = catalogFacets(item);
  const hay = [item.title, item.content_name, ...facets.series, ...facets.character, ...facets.type, ...facets.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  haystackCache.set(item, hay);
  return hay;
}

const lower = (v: string) => v.toLowerCase();

export function matchesSelection(item: CatalogItemLike, selection: CatalogSelection, skip?: FacetKind): boolean {
  const facets = catalogFacets(item);
  for (const kind of Object.keys(selection) as FacetKind[]) {
    if (kind === skip) continue;
    const wanted = selection[kind] ?? [];
    if (wanted.length === 0) continue;
    const have = new Set(facets[kind].map(lower));
    if (!wanted.some((w) => have.has(lower(w)))) return false;
  }
  return true;
}

export function matchesBasics(item: CatalogItemLike, f: CatalogFilterState, owned?: Set<string>): boolean {
  if (f.hideOwned && owned?.has(item.id)) return false;
  if (f.content && (item.content_name ?? "") !== f.content) return false;
  const q = f.query.trim().toLowerCase();
  if (q) {
    const hay = haystack(item);
    if (!q.split(/\s+/).every((term) => hay.includes(term))) return false;
  }
  return true;
}

export function applyFilter<T extends CatalogItemLike>(items: T[], f: CatalogFilterState, owned?: Set<string>): T[] {
  return items.filter((i) => matchesBasics(i, f, owned) && matchesSelection(i, f.selection));
}

export function activeFilterCount(f: CatalogFilterState): number {
  return (
    (f.content ? 1 : 0) +
    (f.hideOwned ? 1 : 0) +
    Object.values(f.selection).reduce((n, v) => n + (v?.length ?? 0), 0)
  );
}

/** 指定した種類のチップ（件数つき）。他の条件で絞った結果に対する件数なので、押すと何件になるかが分かる。 */
export function facetOptions<T extends CatalogItemLike>(
  items: T[],
  f: CatalogFilterState,
  kind: FacetKind,
  owned?: Set<string>
): { value: string; count: number }[] {
  const map = new Map<string, { value: string; count: number }>();
  for (const item of items) {
    if (!matchesBasics(item, f, owned) || !matchesSelection(item, f.selection, kind)) continue;
    for (const value of catalogFacets(item)[kind]) {
      const key = lower(value);
      const hit = map.get(key);
      if (hit) hit.count += 1;
      else map.set(key, { value, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ja"));
}

/** 作品のチップ（件数つき）。作品以外の条件で絞った結果に対する件数。 */
export function contentOptions<T extends CatalogItemLike>(
  items: T[],
  f: CatalogFilterState,
  owned?: Set<string>
): { value: string; count: number }[] {
  const map = new Map<string, number>();
  const withoutContent = { ...f, content: null };
  for (const item of items) {
    const c = (item.content_name ?? "").trim();
    if (!c || c === "なし") continue;
    if (!matchesBasics(item, withoutContent, owned) || !matchesSelection(item, f.selection)) continue;
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ja"));
}
