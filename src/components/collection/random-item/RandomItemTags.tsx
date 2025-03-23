
import { Badge } from "@/components/ui/badge";
import { ItemTag } from "@/types/tag";

interface RandomItemTagsProps {
  tags: ItemTag[];
}

export function RandomItemTags({ tags }: RandomItemTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
      {tags.map((tag, index) => (
        tag.tags && (
          <Badge 
            key={`${tag.tags.id}-${index}`} 
            variant="secondary"
            className="text-xs px-2 py-1"
          >
            {tag.tags.name}
          </Badge>
        )
      ))}
    </div>
  );
}
