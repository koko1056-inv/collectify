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
    <div className="flex justify-between gap-2">
      <Button 
        variant="outline" 
        size="icon"
        onClick={onMemoriesClick}
        className={`${
          hasMemories 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors`}
      >
        <BookMarked className={`h-4 w-4 ${hasMemories ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        onClick={onTagManageClick}
        className={`${
          hasTags 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300" 
            : "border-gray-200 hover:bg-gray-50"
        } transition-colors`}
      >
        <Tag className={`h-4 w-4 ${hasTags ? "text-purple-500" : ""}`} />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        onClick={onShareClick}
        className="border-gray-200 hover:bg-gray-50"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        onClick={onDeleteClick}
        className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}