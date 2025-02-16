
import { OriginalItem } from "@/types";
import { OriginalGoodsCard } from "./OriginalGoodsCard";

interface OriginalItemsGridProps {
  items: OriginalItem[];
}

export function OriginalItemsGrid({ items }: OriginalItemsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((item) => (
        <OriginalGoodsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
