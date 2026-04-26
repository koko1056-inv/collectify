
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
  memories?: any[];
  /** このアイテムの所有者ID(他人のコレクションを表示している場合に使う) */
  ownerId?: string;
}

function MyCollectionGoodsCardComponent({ 
  id, 
  title, 
  image,
  quantity,
  isCompact,
  memories = [],
  ownerId,
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
        className="hover-scale card-shadow bg-card border border-border relative"
      >
        <CardImage image={image} title={title} />
        <div className="p-2 relative">
          <h3 className="text-xs font-medium text-foreground truncate">{title}</h3>
          {quantity && quantity > 1 && (
            <Badge 
              className="absolute bottom-2 right-2 bg-purple-500 hover:bg-purple-500"
            >
              ×{quantity}
            </Badge>
          )}
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
        memories={memories}
        userId={ownerId}
      />
    </div>
  );
}

export const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCardComponent);
