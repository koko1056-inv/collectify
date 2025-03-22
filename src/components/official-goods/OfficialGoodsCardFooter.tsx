
import { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Tag, BookmarkPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: MouseEvent<HTMLButtonElement>) => void;
  onTagManageClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onWishlistClick: (e: MouseEvent<HTMLButtonElement>) => void;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  quantity?: number;
}

export function OfficialGoodsCardFooter({ 
  isInCollection, 
  wishlistCount, 
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  quantity = 1
}: OfficialGoodsCardFooterProps) {
  return (
    <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
      {quantity > 1 && (
        <Badge className="bg-purple-500 hover:bg-purple-500 text-white text-xs">
          ×{quantity}
        </Badge>
      )}
      <div className="flex gap-1 ml-auto">
        <Button
          size="sm"
          variant={isInCollection ? "outline" : "default"}
          className={`h-7 px-2 text-xs ${
            isInCollection 
              ? "border-green-200 bg-green-50 hover:bg-green-100 text-green-700" 
              : "bg-gray-900 hover:bg-gray-800 text-white"
          }`}
          onClick={onAddToCollection}
          title={isInCollection ? "すでにコレクションに追加済み" : "コレクションに追加"}
        >
          <Plus className="h-3 w-3 mr-1" />
          {isInCollection ? "追加済み" : "追加"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 border-gray-200"
          onClick={onTagManageClick}
        >
          <Tag className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs border-gray-200 flex items-center gap-1"
          onClick={onWishlistClick}
        >
          <BookmarkPlus className="h-3 w-3" />
          <span className="text-xs">{wishlistCount > 0 ? wishlistCount : ''}</span>
        </Button>
      </div>
    </div>
  );
}
