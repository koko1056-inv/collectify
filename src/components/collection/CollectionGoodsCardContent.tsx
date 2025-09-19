
import { CardContent as UICardContent } from "@/components/ui/card";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";
import { memo } from "react";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
  memories?: any[];
}

const CollectionGoodsCardContent = memo(function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick,
  memories = []
}: CollectionGoodsCardContentProps) {
  // No more individual query - use provided memories from batch

  return <UICardContent className="px-3 py-1 space-y-0.5">
    </UICardContent>;
});

export { CollectionGoodsCardContent };
