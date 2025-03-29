
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; 
import { Heart, BookMarked } from "lucide-react";
import { CollectionGoodsCard } from "./CollectionGoodsCard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  quantity?: number;
  isCompact?: boolean;
}

function MyCollectionGoodsCardComponent({ 
  id, 
  title, 
  image,
  quantity = 1,
  isCompact 
}: MyCollectionGoodsCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  };

  if (isCompact) {
    return (
      <Card 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="hover-scale card-shadow bg-white border border-gray-200 relative"
      >
        <div className="relative">
          <div className="aspect-square overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover" />
          </div>
          <Badge 
            className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-500 rounded-full"
          >
            ×{quantity}
          </Badge>
        </div>
        <div className="p-2 pb-3 relative">
          <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">0</span>
            </div>
            <div className="flex items-center gap-1">
              <BookMarked className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">0</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CollectionGoodsCard
        id={id}
        title={title}
        image={image}
        quantity={quantity}
      />
    </div>
  );
}

export const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCardComponent);
