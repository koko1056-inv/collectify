interface TagListProps {
  tags: Array<{
    tag_id: string;
    tags: {
      name: string;
    } | null;
  }>;
}

export function TagList({ tags }: TagListProps) {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags
        .filter(tag => tag && tag.tags) // Filter out null or undefined tags
        .map((tag) => (
          <span
            key={tag.tag_id}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
          >
            {tag.tags!.name}
          </span>
        ))}
    </div>
  );
}