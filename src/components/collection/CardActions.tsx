
import { Button } from "@/components/ui/button";
import { MessageSquare, Tag, Trash2, Plus } from "lucide-react";

interface CardActionsProps {
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
  onCreatePostClick: () => void;
  hasMemories: boolean;
  hasTags: boolean;
  tagCount?: number;
}

export function CardActions({
  onMemoriesClick,
  onTagManageClick,
  onDeleteClick,
  onCreatePostClick,
  hasMemories,
  hasTags,
  tagCount = 0,
}: CardActionsProps) {
  return (
    <div className="flex justify-center w-full gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onMemoriesClick();
        }}
        className={`h-8 w-8 p-0 transition-colors ${
          hasMemories 
            ? 'bg-blue-100 hover:bg-blue-200 border border-blue-200' 
            : 'hover:bg-gray-100'
        }`}
      >
        <MessageSquare className={`h-4 w-4 ${hasMemories ? 'text-blue-600' : 'text-gray-400'}`} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onCreatePostClick();
        }}
        className="h-8 w-8 p-0"
      >
        <Plus className="h-4 w-4 text-green-500" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
        className="h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
