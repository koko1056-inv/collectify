import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem } from "@/types";

/** PostgREST が1回で返せる上限（既定1000行）に合わせる */
const PAGE_SIZE = 1000;
/** 同時に投げるリクエスト数。多すぎると回線を取り合って遅くなる */
const CONCURRENCY = 4;

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

async function fetchPage(page: number) {
  const { data, error } = await supabase
    .from("official_items")
    .select(SELECT)
    // 重複として統合されたグッズは一覧に出さない
    .is("merged_into", null)
    // 同じ created_at のグッズが大量にあるので、id でも並べてページ境界で重複・欠落しないようにする
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return data ?? [];
}

/**
 * 公式グッズを全件取得する。
 *
 * カタログが1000件を超えても欠けないよう、件数を先に数えてからページごとに取得する。
 * （1回のクエリだと先頭1000件で打ち切られ、古いグッズが一覧から消えてしまう）
 */
export function useOfficialItems() {
  return useQuery<OfficialItem[]>({
    queryKey: ["official-items"],
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { count, error: countError } = await supabase
        .from("official_items")
        .select("id", { count: "exact", head: true })
        .is("merged_into", null);
      if (countError) throw countError;

      const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
      const rows: Awaited<ReturnType<typeof fetchPage>> = [];
      for (let start = 0; start < pages; start += CONCURRENCY) {
        const batch = await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, pages - start) }, (_, i) => fetchPage(start + i))
        );
        batch.forEach((b) => rows.push(...b));
      }

      return rows.map((item) => ({
        ...item,
        artist: null,
        anime: null,
      })) as OfficialItem[];
    },
  });
}
