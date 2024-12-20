import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Tag } from "@/types";

interface TagListProps {
  tags: Tag[];
  onRemoveTag?: (tagId: string, tagName: string) => Promise<void>;
  onSelectTag?: (tagId: string, tagName: string) => Promise<void>;
  variant?: "secondary" | "outline";
  isRemovable?: boolean;
}

export function TagList({
  tags,
  onRemoveTag,
  onSelectTag,
  variant = "secondary",
  isRemovable = false,
}: TagListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant={variant}
          className={`flex items-center gap-1 ${onSelectTag ? "cursor-pointer hover:bg-secondary" : ""}`}
          onClick={() => onSelectTag?.(tag.id, tag.name)}
        >
          {tag.name}
          {isRemovable && onRemoveTag && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(tag.id, tag.name);
              }}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground">タグはまだ追加されていません</p>
      )}
    </div>
  );
}