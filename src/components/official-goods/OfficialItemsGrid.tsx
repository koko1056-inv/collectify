
import { OfficialItem } from "@/types";
import { MemoizedOfficialGoodsCard } from "./MemoizedOfficialGoodsCard";

interface OfficialItemsGridProps {
  items: OfficialItem[];
}

export function OfficialItemsGrid({ items }: OfficialItemsGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 px-1 sm:px-0">
      {items.map((item) => (
        <MemoizedOfficialGoodsCard
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          artist={item.artist}
          anime={item.anime}
          price={item.price}
          releaseDate={item.release_date}
        />
      ))}
    </div>
  );
}
