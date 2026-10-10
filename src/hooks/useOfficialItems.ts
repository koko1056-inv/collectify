import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem } from "@/types";

/** PostgREST が1回で返せる上限（既定1000行）に合わせる */
const PAGE_SIZE = 1000;
/** 同時に投げるリクエスト数。多すぎると回線を取り合って遅くなる */
const CONCURRENCY = 4;
/** 作品を選ばないときに読み込む件数（新しい順）。数万件ある全体を毎回読み込まないための上限。 */
export const RECENT_LIMIT = 1500;

const SELECT = `
  id,
  title,
  image,
  price,
  release_date,
  created_at,
  created_by,
  content_name,
  description,
  item_type,
  quantity,
  item_tags (
    tags (
      id,
      name,
      category
    )
  )
`;

interface PageFilter {
  content?: string | null;
}

/** 重複として統合されたグッズは出さない。作品が指定されていればその作品だけ。 */
function baseQuery(filter: PageFilter) {
  let q = supabase.from("official_items").select(SELECT).is("merged_into", null);
  if (filter.content) q = q.eq("content_name", filter.content);
  return q;
}

async function fetchPage(filter: PageFilter, page: number, to: number) {
  const { data, error } = await baseQuery(filter)
    // 新しいグッズが先頭に来るよう、発売日の新しい順。
    // まとめて登録したグッズは created_at が同じになるので、発売日を先に見る。
    .order("release_date", { ascending: false })
    // 発売日・登録日が同じグッズも多いので、id でも並べてページ境界で重複・欠落しないようにする
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(page * PAGE_SIZE, Math.min((page + 1) * PAGE_SIZE, to) - 1);
  if (error) throw error;
  return data ?? [];
}

function toItems(rows: unknown[]): OfficialItem[] {
  return (rows as Record<string, unknown>[]).map((item) => ({ ...item, artist: null, anime: null })) as unknown as OfficialItem[];
}

interface UseOfficialItemsOptions {
  /** 指定すると、その作品のグッズを全件読み込む。未指定なら新しい順に RECENT_LIMIT 件まで。 */
  content?: string | null;
  enabled?: boolean;
}

/**
 * 公式グッズを読み込む。
 *
 * カタログは数万件になるので、全件を一度に読み込まない。
 *  - 作品を選んでいる: その作品を全件（1000件ずつ、並列で）
 *  - 選んでいない:     新しい順に RECENT_LIMIT 件
 * 作品を選ばない一覧・検索は useCatalogFeed（サーバーでページ送り）を使う。
 */
export function useOfficialItems(options: UseOfficialItemsOptions = {}) {
  const content = options.content?.trim() || null;
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items", content ?? "__recent"],
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // 作品を切り替えている間、前の一覧を出したままにして、画面が空にならないようにする
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let countQuery = supabase.from("official_items").select("id", { count: "exact", head: true }).is("merged_into", null);
      if (content) countQuery = countQuery.eq("content_name", content);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const total = content ? count ?? 0 : Math.min(count ?? 0, RECENT_LIMIT);
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const rows: unknown[] = [];
      for (let start = 0; start < pages; start += CONCURRENCY) {
        const batch = await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, pages - start) }, (_, i) => fetchPage({ content }, start + i, total))
        );
        batch.forEach((b) => rows.push(...b));
      }
      return toItems(rows);
    },
  });
}

export interface CatalogContent {
  name: string;
  count: number;
}

/** 作品ごとの件数（多い順）。作品チップの表示に使う。 */
export function useCatalogContents() {
  return useQuery<CatalogContent[]>({
    queryKey: ["catalog-content-counts"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("catalog_content_counts");
      if (error) throw error;
      return (data ?? []).map((r: { content_name: string; item_count: number }) => ({
        name: r.content_name,
        count: Number(r.item_count),
      }));
    },
  });
}

/** 作品を選ばないときの一覧を、サーバーから少しずつ（FEED_PAGE 件ずつ）読み足す件数 */
export const FEED_PAGE = 200;

/**
 * 作品を選ばない一覧（「すべて」＋キーワード検索）を、全件に届くようにサーバーでページ送りする。
 * 新しい順。言葉を入れたときは、サーバーのあいまい検索で近い順（ひらがな/カタカナ・全角/半角・英語名・別名・打ち間違いを許す）。
 * 件数は先頭ページと一緒にサーバーが数えた全体の数。
 */
export function useCatalogFeed(term: string, enabled = true) {
  const q = term.trim().replace(/\s+/g, " ");
  const query = useInfiniteQuery({
    queryKey: ["official-items-feed", q],
    enabled,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // 言葉を入れたとき: サーバーのあいまい検索（表記ゆれ・英語名・別名・打ち間違い）で、近い順の id を取り、中身を読む
      if (q) {
        const { data: hits, error: hitErr } = await supabase.rpc("search_official_items", {
          _q: q,
          _limit: FEED_PAGE,
          _offset: pageParam,
        });
        if (hitErr) throw hitErr;
        const rows = hits ?? [];
        const ids = rows.map((r) => r.id);
        const total = rows.length > 0 ? Number(rows[0].total) : 0;
        if (ids.length === 0) return { items: [] as OfficialItem[], total: pageParam === 0 ? 0 : null, next: null };
        const { data, error } = await supabase.from("official_items").select(SELECT).in("id", ids);
        if (error) throw error;
        const byId = new Map((data ?? []).map((r: { id: string }) => [r.id, r]));
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as unknown[];
        return { items: toItems(ordered), total: pageParam === 0 ? total : null, next: ids.length === FEED_PAGE ? pageParam + FEED_PAGE : null };
      }

      const { data, error, count } = await supabase
        .from("official_items")
        .select(SELECT, pageParam === 0 ? { count: "exact" } : undefined)
        .is("merged_into", null)
        .order("release_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(pageParam, pageParam + FEED_PAGE - 1);
      if (error) throw error;
      return { items: toItems(data ?? []), total: count ?? null, next: (data?.length ?? 0) === FEED_PAGE ? pageParam + FEED_PAGE : null };
    },
    getNextPageParam: (last) => last.next,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    items: pages.flatMap((p) => p.items),
    total: pages[0]?.total ?? null,
  };
}

/** 作品名（日本語）→ 英語表記。英語表示と、英語名での検索に使う。 */
export function useContentNamesEn() {
  return useQuery<Map<string, string>>({
    queryKey: ["content-names-en"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_names").select("name, name_en").not("name_en", "is", null);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.name as string, r.name_en as string]));
    },
  });
}
