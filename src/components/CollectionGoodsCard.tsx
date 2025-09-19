
import { CollectionGoodsCardWrapper } from "./collection/CollectionGoodsCardWrapper";

interface CollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  isShared?: boolean;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  isCompact?: boolean;
  memories?: any[];
}

export function CollectionGoodsCard(props: CollectionGoodsCardProps) {
  return (
    <div className="h-full">
      <CollectionGoodsCardWrapper {...props} />
    </div>
  );
}
