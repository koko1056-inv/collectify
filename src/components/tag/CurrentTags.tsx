import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CurrentTagsProps {
  tags: Array<{
    tag_id: string;
    tags: {
      name: string;
    } | null;
  }>;
  onRemove?: (tagId: string) => void;
  className?: string;
}

export function CurrentTags({ tags, onRemove, className = "" }: CurrentTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Badge
          key={tag.tag_id}
          variant="secondary"
          className="flex items-center gap-1 text-xs"
        >
          {tag.tags?.name}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onRemove(tag.tag_id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Badge>
      ))}
    </div>
  );
}