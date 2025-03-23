
import { Card } from "@/components/ui/card";
import { CardImage } from "./CardImage";
import { CollectionGoodsCard } from "../CollectionGoodsCard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  quantity?: number;
  isCompact?: boolean;
  theme?: string | null;
  activeTheme?: string | null;
}

function MyCollectionGoodsCardComponent({ 
  id, 
  title, 
  image,
  quantity,
  isCompact,
  theme,
  activeTheme
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

  const showThemeBadge = theme && theme.length > 0;
  const isHighlighted = activeTheme === theme;

  if (isCompact) {
    return (
      <Card 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`hover-scale card-shadow bg-white border border-gray-200 relative ${isHighlighted ? 'ring-2 ring-gray-900' : ''}`}
      >
        {showThemeBadge && (
          <Badge className="absolute top-1 right-1 z-10 text-[10px] bg-blue-500 hover:bg-blue-500">
            {theme}
          </Badge>
        )}
        <CardImage image={image} title={title} />
        <div className="p-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
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
      className={isHighlighted ? 'ring-2 ring-gray-900 rounded-lg' : ''}
    >
      <div className="relative">
        {showThemeBadge && (
          <Badge className="absolute top-2 right-2 z-10 text-xs bg-blue-500 hover:bg-blue-500">
            {theme}
          </Badge>
        )}
        <CollectionGoodsCard
          id={id}
          title={title}
          image={image}
          quantity={quantity}
        />
      </div>
    </div>
  );
}

export const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCardComponent);
