import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
}

interface CurrentTagsProps {
  tags: Tag[];
  onRemove?: (tagId: string) => void;
  className?: string;
  showRemove?: boolean;
}

export function CurrentTags({ 
  tags, 
  onRemove, 
  className = "", 
  showRemove = true 
}: CurrentTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1 text-xs"
        >
          {tag.name}
          {showRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onRemove(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Badge>
      ))}
    </div>
  );
}