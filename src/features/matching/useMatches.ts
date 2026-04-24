import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchCandidate, CollectionDiffRow } from "./types";

export function useMatches(userId: string | undefined | null, limit = 30) {
  return useQuery({
    queryKey: ["user-matches", userId, limit],
    queryFn: async (): Promise<MatchCandidate[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("find_user_matches" as any, {
        _user_id: userId,
        _limit: limit,
      });
      if (error) {
        console.warn("useMatches error:", error);
        return [];
      }
      return (data ?? []) as MatchCandidate[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCollectionDiff(meId: string | undefined | null, otherId: string | undefined | null) {
  return useQuery({
    queryKey: ["collection-diff", meId, otherId],
    queryFn: async (): Promise<CollectionDiffRow[]> => {
      if (!meId || !otherId) return [];
      const { data, error } = await supabase.rpc("get_collection_diff" as any, {
        _me: meId,
        _other: otherId,
      });
      if (error) {
        console.warn("useCollectionDiff error:", error);
        return [];
      }
      return (data ?? []) as CollectionDiffRow[];
    },
    enabled: !!meId && !!otherId && meId !== otherId,
    staleTime: 1000 * 60 * 2,
  });
}
