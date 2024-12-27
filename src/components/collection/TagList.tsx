interface TagListProps {
  tags: Array<{
    tag_id: string;
    tags: {
      name: string;
    } | null;
  }>;
}

export function TagList({ tags }: TagListProps) {
  return null;
}