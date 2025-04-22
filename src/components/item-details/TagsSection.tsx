
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/TagInput";
import { SimpleItemTag } from "@/utils/tag/types";

interface TagsSectionProps {
  isEditing: boolean;
  tags: SimpleItemTag[];
  editedData: any;
  setEditedData: (data: any) => void;
}

export function TagsSection({
  isEditing,
  tags,
  editedData,
  setEditedData,
}: TagsSectionProps) {
  // タグのリストを処理（nullチェックを含む）
  const validTags = tags.filter(tag => tag.tags !== null);
  const selectedTags = validTags.map(tag => tag.tags?.name || "");

  const handleTagsChange = (newTags: string[]) => {
    setEditedData({ ...editedData, tags: newTags });
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">タグ</div>
        <TagInput
          selectedTags={editedData.tags || selectedTags}
          onTagsChange={handleTagsChange}
        />
      </div>
    );
  }

  if (validTags.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">タグ</div>
      <div className="flex flex-wrap gap-2">
        {validTags.map((tag) => (
          tag.tags && (
            <Badge key={tag.tags.id} variant="secondary">
              {tag.tags.name}
            </Badge>
          )
        ))}
      </div>
    </div>
  );
}
