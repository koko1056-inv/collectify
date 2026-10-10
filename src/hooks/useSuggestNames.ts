import { useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NameSuggestion {
  kind: "content" | "tag";
  id: string;
  name: string;
  category: string | null;
  /** 一番近かった表記（名前・英語名・別名のどれか）。入力と名前が違うときに「ミセス → ミセスグリーンアップル」のように見せる */
  matched: string;
  score: number;
}

/**
 * 「もしかして」の候補。入力した言葉に近い作品名・タグを、表記ゆれ・英語名・別名・打ち間違いを許して返す。
 * 完全に同じ名前そのものは除く（すでに選べているので候補にしない）。
 */
export function useSuggestNames(query: string, kind: "any" | "content" | "tag" = "any", limit = 5) {
  const deferred = useDeferredValue(query.trim());
  const enabled = deferred.length >= 2;
  const result = useQuery({
    queryKey: ["suggest-names", kind, limit, deferred],
    enabled,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<NameSuggestion[]> => {
      const { data, error } = await supabase.rpc("suggest_names", { _q: deferred, _kind: kind, _limit: limit + 3 });
      if (error) throw error;
      return ((data ?? []) as unknown as NameSuggestion[])
        .map((r) => ({ ...r, score: Number(r.score) }))
        .filter((r) => r.name !== deferred)
        .slice(0, limit);
    },
  });
  return { suggestions: enabled ? result.data ?? [] : [], isLoading: enabled && result.isLoading };
}
