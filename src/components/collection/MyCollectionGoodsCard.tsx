import { Card } from "@/components/ui/card";
import { CardImage } from "./CardImage";
import { CollectionGoodsCard } from "../CollectionGoodsCard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  quantity?: number;
  isCompact?: boolean;
  memoriesCount?: number;
}

function MyCollectionGoodsCardComponent({ 
  id, 
  title, 
  image,
  quantity,
  isCompact,
  memoriesCount = 0
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
        className="hover-scale card-shadow bg-white border border-gray-200"
      >
        <CardImage image={image} title={title} memoriesCount={memoriesCount} />
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
        memoriesCount={memoriesCount}
      />
    </div>
  );
}

export const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCardComponent);