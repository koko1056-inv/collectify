import { OfficialItem } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc";

export function useSortedItems(items: OfficialItem[], sortBy: SortOption, ownerCounts: Record<string, number>) {
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
    
    return 0;
  });
}