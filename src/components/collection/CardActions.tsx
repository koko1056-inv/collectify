import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Tag, Repeat } from "lucide-react";

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
}: CardActionsProps) {
  if (isOtherUserCollection) {
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
      </div>
    );
  }

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