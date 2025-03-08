
import { Badge } from "@/components/ui/badge";

// Define the simplified ItemTag interface
interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

interface TagListProps {
  tags: SimpleItemTag[];
}

export function TagList({ tags }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        tag.tags && (
          <Badge
            key={tag.id}
            variant="secondary"
            className="text-xs px-2 py-0.5"
          >
            {tag.tags.name}
          </Badge>
        )
      ))}
    </div>
  );
}
