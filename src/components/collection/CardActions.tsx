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
    <div className="flex justify-end gap-1.5">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onMemoriesClick}
        className={`${
          hasMemories 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors h-8 w-8 p-0`}
      >
        <BookMarked className={`h-3.5 w-3.5 ${hasMemories ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onTagManageClick}
        className={`${
          hasTags 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors h-8 w-8 p-0`}
      >
        <Tag className={`h-3.5 w-3.5 ${hasTags ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onShareClick}
        className="border-gray-200 hover:bg-gray-50 h-8 w-8 p-0"
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onDeleteClick}
        className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 h-8 w-8 p-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}