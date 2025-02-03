import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useItemCounts = () => {
  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id")
        .then(result => {
          const counts: Record<string, number> = {};
          result.data?.forEach(item => {
            counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
          });
          return counts;
        });

      if (error) throw error;
      return data;
    },
  });

  const { data: ownerCounts = {} } = useQuery({
    queryKey: ["owner-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .then(result => {
          const counts: Record<string, number> = {};
          result.data?.forEach(item => {
            counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
          });
          return counts;
        });

      if (error) throw error;
      return data;
    },
  });

  return { wishlistCounts, ownerCounts };
};