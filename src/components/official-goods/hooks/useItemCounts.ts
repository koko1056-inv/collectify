import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useItemCounts = () => {
  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id, count")
        .select("official_item_id, count(*)")
        .groupBy("official_item_id");

      if (error) throw error;
      
      return data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.official_item_id] = Number(curr.count);
        return acc;
      }, {});
    },
  });

  const { data: ownerCounts = {} } = useQuery({
    queryKey: ["owner-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id, count(*)")
        .groupBy("official_item_id");

      if (error) throw error;
      
      return data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.official_item_id] = Number(curr.count);
        return acc;
      }, {});
    },
  });

  return { wishlistCounts, ownerCounts };
};