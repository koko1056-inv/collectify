import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";

interface TagButtonProps {
  onClick: () => void;
}

export function TagButton({ onClick }: TagButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={onClick}
      className="border-gray-200 hover:bg-gray-50"
    >
      <Tag className="h-4 w-4" />
    </Button>
  );
}