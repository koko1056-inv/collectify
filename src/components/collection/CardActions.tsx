import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Tag } from "lucide-react";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
  hasMemories: boolean;
  hasTags: boolean;
}

export function CardActions({
  onMemoriesClick,
  onTagManageClick,
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
        className="border-gray-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-500 transition-colors h-7 w-7 p-0"
      >
        <PlusCircle className="h-3 w-3" />
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
          onDeleteClick();
        }}
        className="border-gray-200 hover:bg-gray-50 hover:border-red-200 hover:text-red-500 h-7 w-7 p-0"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}