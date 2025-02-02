import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Tag } from "lucide-react";

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
  hasMemories,
  hasTags,
  showTradeButton = false,
  isOtherUserCollection = false,
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
            トレード
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center w-full" onClick={(e) => e.stopPropagation()}>
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
        } transition-colors h-7 px-2`}
      >
        <Tag className={`h-3.5 w-3.5 mr-1 ${hasTags ? "text-purple-500" : ""}`} />
        タグを追加
      </Button>
      
      <div className="flex gap-1">
        {showTradeButton && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTradeClick?.();
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white transition-colors h-7 px-2 text-xs"
          >
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
          className="bg-gray-900 hover:bg-gray-800 text-white transition-colors h-7 px-2 text-xs whitespace-nowrap"
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1" />
          記録を追加
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
          className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 h-7 px-2"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          削除
        </Button>
      </div>
    </div>
  );
}