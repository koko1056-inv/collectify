import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeCompletionRows, summarizeCompletion, type CompletionRow, type ZukanItemLike } from "@/utils/zukan";

/**
 * 作品の所持率（get_catalog_completion）。
 *
 * RPC がまだ本番に入っていない・失敗したときは、手元に読み込んだその作品の全グッズ（items）と
 * 所持 id から同じ形で数える（画面は同じに見える。数は読み込んだ分だけになる）。
 * 所持 id が変わったら（グッズを追加・削除したら）数え直す。
 */
export function useCatalogCompletion(
  content: string | null,
  items: ZukanItemLike[],
  itemsReady: boolean,
  ownedIds: ReadonlySet<string> | null,
  ownedUpdatedAt: number
) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const queryClient = useQueryClient();
  const key = useMemo(() => ["catalog-completion", content, uid] as const, [content, uid]);

  const rpc = useQuery({
    queryKey: key,
    enabled: !!content,
    staleTime: 1000 * 60,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_catalog_completion", { _content: content! });
      if (error) throw error;
      return (data ?? []) as CompletionRow[];
    },
  });

  // 所持が変わったら数え直す（最初の読み込みでは投げない）
  const lastOwnedAt = useRef(ownedUpdatedAt);
  useEffect(() => {
    const prev = lastOwnedAt.current;
    lastOwnedAt.current = ownedUpdatedAt;
    if (!content || !prev || prev === ownedUpdatedAt) return;
    void queryClient.invalidateQueries({ queryKey: key });
  }, [ownedUpdatedAt, content, key, queryClient]);

  const fallback = useMemo(
    () => (rpc.isError && content && itemsReady ? computeCompletionRows(items, ownedIds, content) : null),
    [rpc.isError, content, itemsReady, items, ownedIds]
  );

  const rows = rpc.data ?? fallback;
  const summary = useMemo(() => (rows ? summarizeCompletion(rows) : null), [rows]);
  return { summary, isLoading: !!content && !rows && (rpc.isLoading || (rpc.isError && !itemsReady)) };
}
