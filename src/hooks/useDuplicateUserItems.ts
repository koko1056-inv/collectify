import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DuplicateGroup {
  groupKey: string;
  keeperId: string;
  title: string;
  image: string;
  cardCount: number;
  totalQuantity: number;
}

/**
 * 同じグッズが別々のカードになっている組。
 * まとめられるのは自分のコレクションだけなので、ほかの人の棚を見ているときは enabled=false で呼ぶ。
 */
export function useDuplicateUserItems(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["duplicate-user-items", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DuplicateGroup[]> => {
      const { data, error } = await supabase.rpc("find_duplicate_user_items");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        groupKey: g.group_key,
        keeperId: g.keeper_id,
        title: g.title,
        image: g.image,
        cardCount: g.card_count,
        totalQuantity: g.total_quantity,
      }));
    },
  });
}

export function useMergeDuplicateUserItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ mergedGroups: number; removedCards: number }> => {
      const { data, error } = await supabase.rpc("merge_duplicate_user_items");
      const body = data as { ok?: boolean; merged_groups?: number; removed_cards?: number } | null;
      if (error || !body || body.ok !== true) {
        console.error("merge duplicate items failed:", error ?? body);
        throw error ?? new Error("merge_failed");
      }
      return { mergedGroups: body.merged_groups ?? 0, removedCards: body.removed_cards ?? 0 };
    },
    onSuccess: () => {
      // カードの数と並びが変わるので、棚まわりの表示をまとめて引き直す
      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      queryClient.invalidateQueries({ queryKey: ["duplicate-user-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["collection-progress"] });
      queryClient.invalidateQueries({ queryKey: ["my-trades", user?.id] });
    },
  });
}
