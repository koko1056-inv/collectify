
import { Badge } from "@/components/ui/badge";
import { SimpleTag, SimpleItemTag } from "@/utils/tag/types";

interface TagListProps {
  tags: SimpleTag[] | SimpleItemTag[];
  className?: string;
}

export function TagList({ tags, className = "" }: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const renderTag = (tag: SimpleTag | SimpleItemTag) => {
    // SimpleItemTagの場合（tagsプロパティが存在する）
    if ('tags' in tag && tag.tags) {
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
    // SimpleTagの場合
    else {
      return (
        <Badge 
          key={(tag as SimpleTag).id}
          variant="outline" 
          className={`text-[10px] border-gray-200 py-0 px-2 ${className}`}
        >
          {(tag as SimpleTag).name}
        </Badge>
      );
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(renderTag)}
    </div>
  );
}
