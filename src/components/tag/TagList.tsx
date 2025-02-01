import { Badge } from "@/components/ui/badge";

interface TagListProps {
  tags: Array<{ tags: { id: string; name: string; } | null; }>;
}

export function TagList({ tags }: TagListProps) {
  const validTags = tags.filter((tag): tag is { tags: { id: string; name: string; } } => 
    tag.tags !== null
  );

  if (validTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {validTags.map((tag) => (
        <Badge
          key={tag.tags.id}
          variant="secondary"
          className="text-xs"
        >
          {tag.tags.name}
        </Badge>
      ))}
    </div>
  );
}