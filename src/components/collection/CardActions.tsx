
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Tag, Repeat, Hash } from "lucide-react";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
  onTradeClick?: () => void;
  onLikeClick?: () => void;
  hasMemories: boolean;
  hasTags: boolean;
  showTradeButton?: boolean;
  isOtherUserCollection?: boolean;
  isLiked?: boolean;
  quantity?: number;
  onQuantityClick?: () => void;
}

export function CardActions({
  onMemoriesClick,
  onTagManageClick,
  onDeleteClick,
  onTradeClick,
  onLikeClick,
  hasMemories,
  hasTags,
  showTradeButton = false,
  isOtherUserCollection = false,
  isLiked = false,
  quantity = 1,
  onQuantityClick,
}: CardActionsProps) {
  // If it's another user's collection, only show trade button if applicable
  if (isOtherUserCollection) {
    return showTradeButton ? (
      <div className="flex justify-end gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTradeClick?.();
          }}
          className="bg-gray-900 hover:bg-gray-800 text-white transition-colors h-6 px-2 text-xs"
        >
          <Repeat className="h-3 w-3 mr-1" />
          トレード
        </Button>
      </div>
    ) : null;
  }

  // Show all action buttons for user's own collection
  return (
    <div className="flex justify-end gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      {showTradeButton && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTradeClick?.();
          }}
          className="bg-gray-900 hover:bg-gray-800 text-white transition-colors h-6 px-2 text-xs"
        >
          <Repeat className="h-3 w-3 mr-1" />
          トレード
        </Button>
      )}
      <Button 
        variant="default"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onMemoriesClick();
        }}
        className="bg-gray-900 hover:bg-gray-800 text-white transition-colors h-6 px-2 text-xs whitespace-nowrap"
      >
        <PlusCircle className="h-3 w-3 mr-1" />
        記録を追加
      </Button>
      {quantity > 1 && onQuantityClick && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onQuantityClick();
          }}
          className="border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors h-6 w-6 p-0"
        >
          <Hash className="h-3 w-3 text-blue-500" />
        </Button>
      )}
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onTagManageClick();
        }}
        className={`${
          hasTags 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors h-6 w-6 p-0`}
      >
        <Tag className={`h-3 w-3 ${hasTags ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
        className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 h-6 w-6 p-0"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
