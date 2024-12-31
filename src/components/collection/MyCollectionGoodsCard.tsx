import { Card } from "@/components/ui/card";
import { CardImage } from "./CardImage";
import { CollectionGoodsCard } from "../CollectionGoodsCard";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  isShared: boolean;
  quantity?: number;
  isCompact?: boolean;
}

export function MyCollectionGoodsCard({ 
  id, 
  title, 
  image, 
  isShared, 
  quantity,
  isCompact 
}: MyCollectionGoodsCardProps) {
  if (isCompact) {
    return (
      <Card className="hover-scale card-shadow bg-white border border-gray-200">
        <CardImage image={image} title={title} />
      </Card>
    );
  }

  return (
    <CollectionGoodsCard
      id={id}
      title={title}
      image={image}
      isShared={isShared}
      quantity={quantity}
    />
  );
}