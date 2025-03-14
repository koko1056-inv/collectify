
interface Tag {
  tags: {
    id: string;
    name: string;
  } | null;
}

interface RandomItemTagsProps {
  tags: Tag[];
}

export function RandomItemTags({ tags }: RandomItemTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
      {tags.map((tag) => (
        tag.tags && (
          <span 
            key={tag.tags.id} 
            className="bg-gray-100 text-xs px-2 py-1 rounded-full"
          >
            {tag.tags.name}
          </span>
        )
      ))}
    </div>
  );
}
