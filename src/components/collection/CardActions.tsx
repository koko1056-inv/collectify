
import { Button } from "@/components/ui/button";
import { MessageSquare, Tag, Trash2, Camera } from "lucide-react";

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
        className="h-8 w-8 p-0"
      >
        <MessageSquare className={`h-4 w-4 ${hasMemories ? 'text-blue-500' : 'text-gray-400'}`} />
      </Button>
      
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTagManageClick();
          }}
          className="h-8 w-8 p-0"
        >
          <Tag className={`h-4 w-4 ${hasTags ? 'text-purple-500' : 'text-gray-400'}`} />
        </Button>
        <span className="text-[10px] text-gray-500 mt-0.5">{tagCount}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onCreatePostClick();
        }}
        className="h-8 w-8 p-0"
      >
        <Camera className="h-4 w-4 text-green-500" />
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
