import { OfficialItem } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

export function useSortedItems(items: OfficialItem[], sortBy: SortOption, ownerCounts: Record<string, number>) {
  const { user } = useAuth();
  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.official_item_id] = (counts[item.official_item_id] || 0) + 1;
      });

      return counts;
    },
  });

  const { data: userItems = [] } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && sortBy === "not-owned",
  });

  console.log("Sorting items by:", sortBy);

  return [...items].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    if (sortBy === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    if (sortBy === "wishlist") {
      const aCount = wishlistCounts[a.id] || 0;
      const bCount = wishlistCounts[b.id] || 0;
      
      if (aCount !== bCount) {
        return bCount - aCount;
      }
      // If wishlist counts are equal, sort by newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    if (sortBy === "owners-desc") {
      const aCount = ownerCounts[a.id] || 0;
      const bCount = ownerCounts[b.id] || 0;
      
      if (aCount !== bCount) {
        return bCount - aCount; // 降順（多い順）
      }
      // If owner counts are equal, sort by newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    if (sortBy === "owners-asc") {
      const aCount = ownerCounts[a.id] || 0;
      const bCount = ownerCounts[b.id] || 0;
      
      if (aCount !== bCount) {
        return aCount - bCount; // 昇順（少ない順）
      }
      // If owner counts are equal, sort by newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    if (sortBy === "not-owned") {
      const userItemIds = new Set(userItems.map(item => item.official_item_id));
      const aOwned = userItemIds.has(a.id);
      const bOwned = userItemIds.has(b.id);
      
      // 未所持のアイテムを先に表示
      if (aOwned !== bOwned) {
        return aOwned ? 1 : -1;
      }
      // 同じ所持状態の場合は新しい順
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    return 0;
  });
}