import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  tagCount: number;
}

export function TagButton({ onClick, tagCount }: TagButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        className="border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9"
      >
        <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{tagCount}</span>
    </div>
  );
}