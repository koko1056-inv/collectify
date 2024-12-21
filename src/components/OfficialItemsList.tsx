import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OfficialItem } from "@/types";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const navigate = useNavigate();
  
  const displayedItems = items.slice(0, -6);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold animate-fade-in text-gray-900">
          公式グッズ
        </h1>
        <Button 
          onClick={() => navigate("/add-item")}
          className="bg-gray-900 hover:bg-gray-800"
        >
          新規アイテムを追加
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedItems.map((item) => (
          <OfficialGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            item_tags={item.item_tags}
            artist={item.artist}
            anime={item.anime}
          />
        ))}
      </div>
    </div>
  );
}