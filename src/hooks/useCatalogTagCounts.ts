import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ALWAYS_SHOWN_CATEGORIES,
  ID_CHUNK,
  PAGE_SIZE,
  attachTagInfo,
  chunk,
  countTagIds,
  isMissingRpcError,
  mergeAlwaysShown,
  remainingPageOffsets,
  rowsToCountedTags,
  sortTagsByCount,
  type CatalogTagCountRow,
  type CountedTag,
  type TagInfo,
} from "@/utils/tag/catalog-tag-counts";

const TAG_COLUMNS = "id, name, category, content_id, created_at";
/** 予備の読み方で、同時に投げるリクエストの数 */
const PARALLEL = 4;

/** 決まった数ずつ並べて実行する（何十ページも一度に投げない） */
async function runLimited<T, R>(list: T[], limit: number, fn: (v: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

/** サーバーで数える（catalog_tag_counts）。1000行を超えるときはページを分けて読む */
async function fetchViaRpc(contentName: string | null): Promise<CountedTag[]> {
  const rows: CatalogTagCountRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .rpc("catalog_tag_counts", { _content_name: contentName })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as CatalogTagCountRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rowsToCountedTags(rows);
}

/**
 * 予備: RPC がまだ無いとき、作品のグッズを（content_name の索引で）1000件ずつ読み、
 * それぞれに付いた tag_id だけを一緒に受け取って画面側で数える。
 * グッズの id を URL に並べないので、作品がどれだけ大きくても URL は短いまま。
 * （item_tags 側から結合して読むと、ちいかわでは 38 回になり、混んでいると時間切れになった）
 */
async function fetchContentFallback(contentName: string): Promise<CountedTag[]> {
  const pageQuery = (from: number, withCount: boolean) =>
    supabase
      .from("official_items")
      .select("item_tags(tag_id)", withCount ? { count: "exact" } : undefined)
      .eq("content_name", contentName)
      .is("merged_into", null)
      .eq("exclude_from_lists", false)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

  const first = await pageQuery(0, true);
  if (first.error) throw first.error;
  const pages = await runLimited(remainingPageOffsets(first.count ?? 0), PARALLEL, async (from) => {
    const { data, error } = await pageQuery(from, false);
    if (error) throw error;
    return data ?? [];
  });
  const tagIds = [first.data ?? [], ...pages]
    .flat()
    .flatMap((item) => ((item as { item_tags: { tag_id: string }[] | null }).item_tags ?? []).map((r) => r.tag_id));
  const counts = countTagIds(tagIds);

  // タグの中身は、少しずつ id を並べて読む（数百件でも URL が長くなりすぎないように）
  const infos = await runLimited(chunk([...counts.keys()], ID_CHUNK), PARALLEL, async (ids) => {
    const { data, error } = await supabase.from("tags").select(TAG_COLUMNS).in("id", ids);
    if (error) throw error;
    return (data ?? []) as TagInfo[];
  });
  return attachTagInfo(counts, infos.flat());
}

/**
 * 予備: すべての作品のとき。全 item_tags（20万行ほど）を読むのは重すぎるので、
 * タグに記録されている使用回数（usage_count）を数として使う
 */
async function fetchAllFallback(): Promise<CountedTag[]> {
  const out: CountedTag[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("tags")
      .select(`${TAG_COLUMNS}, usage_count`)
      .gt("usage_count", 0)
      .order("usage_count", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const t of page) out.push({ id: t.id, name: t.name, category: t.category, content_id: t.content_id, created_at: t.created_at, count: t.usage_count });
    if (page.length < PAGE_SIZE) break;
  }
  return sortTagsByCount(out);
}

/** グッズタイプ・入手方法のタグ（作品に関係なく出す） */
async function fetchAlwaysShownTags(): Promise<TagInfo[]> {
  const { data, error } = await supabase.from("tags").select(TAG_COLUMNS).in("category", [...ALWAYS_SHOWN_CATEGORIES]);
  if (error) throw error;
  return (data ?? []) as TagInfo[];
}

export async function fetchCatalogTagCounts(selectedContent?: string): Promise<CountedTag[]> {
  const contentName = selectedContent && selectedContent !== "all" ? selectedContent : null;

  let counted: CountedTag[];
  try {
    counted = await fetchViaRpc(contentName);
  } catch (error) {
    // マイグレーションがまだ当たっていないときだけ、予備の読み方にする
    if (!isMissingRpcError(error)) throw error;
    counted = contentName ? await fetchContentFallback(contentName) : await fetchAllFallback();
  }

  if (!contentName) return sortTagsByCount(counted);
  return mergeAlwaysShown(counted, await fetchAlwaysShownTags());
}

/** 絞り込みの「タグから選択」に出す、タグごとのグッズ数 */
export function useCatalogTagCounts(selectedContent?: string) {
  return useQuery({
    queryKey: ["tags-with-count", selectedContent],
    queryFn: () => fetchCatalogTagCounts(selectedContent),
    staleTime: 1000 * 60 * 5,
  });
}
