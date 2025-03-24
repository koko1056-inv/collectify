
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";

interface TagListProps {
  tags: SimpleItemTag[];
}

export function TagList({ tags }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs px-2 py-0.5"
        >
          {tag.tags.name}
        </Badge>
      ))}
    </div>
  );
}
