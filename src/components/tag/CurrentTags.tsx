
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CurrentTagsProps {
  tags: string[];
  onRemove: (tag: string) => void;
}

export function CurrentTags({ tags, onRemove }: CurrentTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex items-center gap-1"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(tag);
            }}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
