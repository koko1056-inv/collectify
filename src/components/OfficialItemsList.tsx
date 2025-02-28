
import { OfficialItem } from "@/types";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { useMemo, useState } from "react";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "wishlist" | "owners">("newest");
  const { ownerCounts } = useItemCounts();
  
  // useSortedItemsを使用して並べ替え
  const sortedItems = useSortedItems(items, sortBy, ownerCounts);

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">条件に一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OfficialItemsHeader sortBy={sortBy} onSortChange={setSortBy} itemCount={items.length} />
      <OfficialItemsGrid items={sortedItems} />
    </div>
  );
}
