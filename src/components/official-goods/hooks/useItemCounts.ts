import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useItemCounts = () => {
  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.official_item_id) {
          counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const { data: ownerCounts = {} } = useQuery({
    queryKey: ["owner-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .not("official_item_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.official_item_id) {
          counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  return { wishlistCounts, ownerCounts };
};