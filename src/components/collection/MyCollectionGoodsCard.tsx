import { CollectionGoodsCard } from "../CollectionGoodsCard";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  isShared: boolean;
  quantity?: number;
}

export function MyCollectionGoodsCard({ id, title, image, isShared, quantity }: MyCollectionGoodsCardProps) {
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