
import { CardHeader as UICardHeader } from "@/components/ui/card";
import { CardImage } from "./CardImage";

interface CollectionGoodsCardHeaderProps {
  title: string;
  image: string;
  isCompact?: boolean;
}

export function CollectionGoodsCardHeader({ title, image, isCompact }: CollectionGoodsCardHeaderProps) {
  return (
    <UICardHeader className="p-0">
      <CardImage title={title} image={image} />
    </UICardHeader>
  );
}
