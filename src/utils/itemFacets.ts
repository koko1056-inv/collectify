/**
 * マイコレクションの絞り込み用に、グッズ1件から「作品 / キャラ / 種類 / 入手方法」を取り出す。
 *
 * 作品名は user_items.content_name（手入力・AI読み取り）だけだと空のことが多いので、
 * 紐付いた公式グッズの content_name と、公式グッズに付いたタグも拾う。
 * サーバー側の official_item_series() と同じ考え方で、「なし」は未設定扱いにする。
 */

export type FacetKind = "series" | "character" | "type" | "source";

export interface ItemFacets {
  series: string[];
  character: string[];
  type: string[];
  source: string[];
}

interface FacetSourceItem {
  title?: string | null;
  content_name?: string | null;
  official_items?: {
    content_name?: string | null;
    item_tags?: { tags?: { name?: string | null; category?: string | null } | null }[] | null;
  } | null;
  user_item_tags?: { tags?: { name?: string | null } | null }[] | null;
}

const PLACEHOLDERS = new Set(["", "なし", "none", "n/a"]);

function clean(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return PLACEHOLDERS.has(v.toLowerCase()) ? null : v;
}

function push(list: string[], seen: Set<string>, value: string | null) {
  if (!value) return;
  const key = value.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push(value);
}

export function getItemFacets(item: FacetSourceItem): ItemFacets {
  const out: ItemFacets = { series: [], character: [], type: [], source: [] };
  const seen: Record<FacetKind, Set<string>> = {
    series: new Set(),
    character: new Set(),
    type: new Set(),
    source: new Set(),
  };

  push(out.series, seen.series, clean(item.content_name));
  push(out.series, seen.series, clean(item.official_items?.content_name));

  for (const row of item.official_items?.item_tags ?? []) {
    const tag = row.tags;
    const name = clean(tag?.name);
    const category = tag?.category;
    if (!name) continue;
    if (category === "series" || category === "character" || category === "type" || category === "source") {
      push(out[category], seen[category], name);
    }
  }
  return out;
}

export interface FacetCount {
  value: string;
  count: number;
}

/** 件数の多い順（同数は五十音順）。 */
export function countFacets(items: FacetSourceItem[], kind: FacetKind): FacetCount[] {
  const map = new Map<string, { value: string; count: number }>();
  for (const item of items) {
    for (const value of getItemFacets(item)[kind]) {
      const key = value.toLowerCase();
      const hit = map.get(key);
      if (hit) hit.count += 1;
      else map.set(key, { value, count: 1 });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, "ja")
  );
}

/** 検索語（空白区切りAND）に、タイトル・メモ・作品/キャラ/種類・マイタグが全部ヒットするか。 */
export function matchesQuery(
  item: FacetSourceItem & { note?: string | null },
  query: string
): boolean {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return true;
  const f = getItemFacets(item);
  const haystack = [
    item.title,
    item.note,
    ...f.series,
    ...f.character,
    ...f.type,
    ...f.source,
    ...(item.user_item_tags?.map((t) => t.tags?.name) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function itemHasFacet(item: FacetSourceItem, kind: FacetKind, value: string): boolean {
  const key = value.toLowerCase();
  return getItemFacets(item)[kind].some((v) => v.toLowerCase() === key);
}
