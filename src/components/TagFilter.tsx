import { Badge } from "@/components/ui/badge";
import { Tag } from "@/types";

interface TagFilterProps {
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTag, onTagSelect, tags }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selectedTag === null ? "default" : "outline"}
        className="cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => onTagSelect(null)}
      >
        すべて
      </Badge>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant={selectedTag === tag.name ? "default" : "outline"}
          className="cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onTagSelect(tag.name)}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}