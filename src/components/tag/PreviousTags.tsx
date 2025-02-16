
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/types";

interface PreviousTagsProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagName: string) => void;
  title: string;
}

export function PreviousTags({ tags, selectedTags, onTagSelect, title }: PreviousTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground mb-1">{title}:</p>
      <div className="flex flex-wrap gap-2 max-w-xl mx-auto">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="cursor-pointer hover:bg-secondary bg-white truncate max-w-[150px] sm:max-w-xs"
            onClick={() => {
              if (!selectedTags.includes(tag.name)) {
                onTagSelect(tag.name);
              }
            }}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
