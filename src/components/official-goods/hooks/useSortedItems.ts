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
          if (b.wishlistCount === a.wishlistCount) {
            // ウィッシュリスト数が同じ場合は新しい順
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return b.wishlistCount - a.wishlistCount;
        case "owners":
          if (b.ownerCount === a.ownerCount) {
            // 保有者数が同じ場合は新しい順
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return b.ownerCount - a.ownerCount;
        default:
          return 0;
      }
    });
  }, [items, sortBy, wishlistCounts, ownerCounts]);
};