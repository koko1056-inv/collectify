
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/TagInput";

interface TagsSectionProps {
  isEditing: boolean;
  tags: Array<{ tags: { id: string; name: string; } | null; }>;
  editedData: any;
  setEditedData: (data: any) => void;
}

export function TagsSection({
  isEditing,
  tags,
  editedData,
  setEditedData,
}: TagsSectionProps) {
  const selectedTags = tags
    .filter((tag): tag is { tags: { id: string; name: string; } } => 
      tag.tags !== null
    )
    .map(tag => tag.tags.name);

  const handleTagsChange = (newTags: string[]) => {
    setEditedData({ ...editedData, tags: newTags });
  };

  if (isEditing) {
    return (
      <TagInput
        selectedTags={editedData.tags || selectedTags}
        onTagsChange={handleTagsChange}
      />
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">タグ</div>
      <div className="flex flex-wrap gap-2">
        {tags
          .filter((tag): tag is { tags: { id: string; name: string; } } => 
            tag.tags !== null
          )
          .map((tag) => (
            <Badge key={tag.tags.id} variant="secondary">
              {tag.tags.name}
            </Badge>
          ))}
      </div>
    </div>
  );
}
