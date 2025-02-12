
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useItemCounts() {
  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: ownerCounts = {} } = useQuery({
    queryKey: ["owner-counts"],
    queryFn: async () => {
      // ここで集計クエリを使用して、より正確な数を取得
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id, user_id, quantity")
        .not("official_item_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      // ユーザーごとのアイテム数を集計
      const userItemQuantities: Record<string, Record<string, number>> = {};

      data?.forEach(item => {
        if (!item.official_item_id) return;

        // ユーザーごとのアイテム数を追跡
        if (!userItemQuantities[item.user_id]) {
          userItemQuantities[item.user_id] = {};
        }
        
        // 同じユーザーが同じアイテムを複数回登録している場合は、最大の数量を使用
        const currentQuantity = userItemQuantities[item.user_id][item.official_item_id] || 0;
        const newQuantity = item.quantity || 1;
        userItemQuantities[item.user_id][item.official_item_id] = Math.max(currentQuantity, newQuantity);
      });

      // ユーザーごとの数量を合計して最終的な所有者数を計算
      Object.values(userItemQuantities).forEach(userItems => {
        Object.entries(userItems).forEach(([itemId, quantity]) => {
          counts[itemId] = (counts[itemId] || 0) + quantity;
        });
      });
      
      console.log("Owner counts after calculation:", counts);
      return counts;
    },
  });

  return { wishlistCounts, ownerCounts };
}
