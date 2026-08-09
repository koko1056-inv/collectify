import { CardHeader as UICardHeader } from "@/components/ui/card";
import { CardImage } from "./CardImage";

interface CollectionGoodsCardHeaderProps {
  title: string;
  image: string;
  quantity?: number;
  forTrade?: boolean;
}

export function CollectionGoodsCardHeader({ title, image, quantity, forTrade }: CollectionGoodsCardHeaderProps) {
  return (
    <UICardHeader className="p-0">
      <CardImage title={title} image={image} quantity={quantity} forTrade={forTrade} />
    </UICardHeader>
  );
}