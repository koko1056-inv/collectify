import { Button } from "@/components/ui/button";
import { Share2, BookMarked, Trash2, Tag } from "lucide-react";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onShareClick: () => void;
  onDeleteClick: () => void;
  hasMemories: boolean;
  hasTags: boolean;
}

export function CardActions({
  onMemoriesClick,
  onTagManageClick,
  onShareClick,
  onDeleteClick,
  hasMemories,
  hasTags,
}: CardActionsProps) {
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onMemoriesClick();
        }}
        className={`${
          hasMemories 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors h-7 w-7 p-0`}
      >
        <BookMarked className={`h-3 w-3 ${hasMemories ? "text-purple-500" : ""}`} />
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
        } transition-colors h-7 w-7 p-0`}
      >
        <Tag className={`h-3 w-3 ${hasTags ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
        className="border-gray-200 hover:bg-gray-50 h-7 w-7 p-0"
      >
        <Share2 className="h-3 w-3" />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
        className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 h-7 w-7 p-0"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}