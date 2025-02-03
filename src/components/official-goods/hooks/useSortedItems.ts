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
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "wishlist": {
          const wishlistCountA = wishlistCounts[a.id] || 0;
          const wishlistCountB = wishlistCounts[b.id] || 0;
          if (wishlistCountA === wishlistCountB) {
            // If wishlist counts are equal, sort by newest
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return wishlistCountB - wishlistCountA;
        }
        case "owners": {
          const ownerCountA = ownerCounts[a.id] || 0;
          const ownerCountB = ownerCounts[b.id] || 0;
          if (ownerCountA === ownerCountB) {
            // If owner counts are equal, sort by newest
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return ownerCountB - ownerCountA;
        }
        default:
          return 0;
      }
    });
  }, [items, sortBy, wishlistCounts, ownerCounts]);
};