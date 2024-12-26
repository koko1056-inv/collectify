import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  tagCount?: number;
}

export function TagButton({ onClick, tagCount = 0 }: TagButtonProps) {
  return (
    <div className="flex flex-col items-center">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={onClick}
        className="border-gray-200 hover:bg-gray-50"
      >
        <Tag className="h-4 w-4" />
      </Button>
      <span className="text-xs text-gray-500 mt-1">{tagCount}</span>
    </div>
  );
}