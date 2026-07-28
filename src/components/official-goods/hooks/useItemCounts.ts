
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OwnerCounts {
  /** グッズID→所持数の合計 */
  quantities: Record<string, number>;
  /** グッズID→所有者の人数 */
  distinctOwners: Record<string, number>;
}

// 読み込み中のフォールバック。毎レンダーで作り直すと参照が変わって
// 下流のメモ化が無駄に外れるので、モジュール側で1つだけ持つ。
const EMPTY_OWNER_COUNTS: OwnerCounts = { quantities: {}, distinctOwners: {} };

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

  const { data: ownerCounts = EMPTY_OWNER_COUNTS } = useQuery({
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
      // 「何人が持っているか」（重複所持は1人と数える）。
      // 以前はカード1枚ごとに同じ問い合わせを投げていたので、ここでまとめて数える。
      const ownerSets: Record<string, Set<string>> = {};

      data?.forEach(item => {
        if (!item.official_item_id) return;

        (ownerSets[item.official_item_id] ||= new Set()).add(item.user_id);

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
      
      const distinct: Record<string, number> = {};
      Object.entries(ownerSets).forEach(([itemId, users]) => {
        distinct[itemId] = users.size;
      });

      return { quantities: counts, distinctOwners: distinct };
    },
  });

  return {
    wishlistCounts,
    /** グッズごとの所持数の合計（並び替えに使う） */
    ownerCounts: ownerCounts.quantities,
    /** グッズごとの所有者の人数（カードの「◯人が所有」表示に使う） */
    distinctOwnerCounts: ownerCounts.distinctOwners,
  };
}
