import { OfficialItem } from "@/types";
import { useMemo } from "react";

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

export const useSortedItems = (
  items: OfficialItem[],
  sortBy: SortOption,
  wishlistCounts: Record<string, number>,
  ownerCounts: Record<string, number>
) => {
  return useMemo(() => {
    console.log('Sorting items by:', sortBy);
    console.log('Owner counts:', ownerCounts);
    
    const itemsWithCounts = items.map(item => ({
      ...item,
      wishlistCount: wishlistCounts[item.id] || 0,
      ownerCount: ownerCounts[item.id] || 0,
    }));

    return [...itemsWithCounts].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "wishlist":
          return b.wishlistCount - a.wishlistCount || 
                 new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "owners":
          const aCount = ownerCounts[a.id] || 0;
          const bCount = ownerCounts[b.id] || 0;
          console.log(`Comparing items - ${a.title}: ${aCount} owners, ${b.title}: ${bCount} owners`);
          return bCount - aCount || 
                 new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [items, sortBy, wishlistCounts, ownerCounts]);
};