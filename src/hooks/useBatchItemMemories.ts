import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBatchItemMemories(itemIds: string[]) {
  return useQuery({
    queryKey: ["batch-item-memories", itemIds.sort()],
    queryFn: async () => {
      if (!itemIds.length) return {};
      
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .in("user_item_id", itemIds)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching batch memories:", error);
        throw error;
      }
      
      // Group memories by user_item_id for easy access
      const memoriesByItemId: Record<string, any[]> = {};
      data?.forEach(memory => {
        if (!memoriesByItemId[memory.user_item_id]) {
          memoriesByItemId[memory.user_item_id] = [];
        }
        memoriesByItemId[memory.user_item_id].push(memory);
      });
      
      return memoriesByItemId;
    },
    enabled: itemIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}