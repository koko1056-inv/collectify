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
}

export function CollectionGoodsCard(props: CollectionGoodsCardProps) {
  return <CollectionGoodsCardWrapper {...props} />;
}