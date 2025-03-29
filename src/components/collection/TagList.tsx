
import { Badge } from "@/components/ui/badge";
import { SimpleItemTag } from "@/utils/tag/types";

interface TagListProps {
  tags: SimpleItemTag[];
  className?: string;
}

export function TagList({ tags, className = "" }: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const renderTag = (tag: SimpleItemTag) => {
    if (tag.tags) {
      return (
        <Badge 
          key={tag.tag_id}
          variant="outline" 
          className={`text-[10px] border-gray-200 py-0 px-2 ${className}`}
        >
          {tag.tags.name}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(renderTag)}
    </div>
  );
}
