
import { Badge } from "@/components/ui/badge";
import { ItemTag } from "@/utils/tag-operations";

interface CurrentTagsListProps {
  currentTags: ItemTag[];
}

export function CurrentTagsList({ currentTags }: CurrentTagsListProps) {
  if (currentTags.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium mb-2">現在のタグ:</h3>
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tag) => (
          tag.tags && (
            <Badge key={tag.tag_id} variant="secondary" className="text-sm">
              {tag.tags.name}
            </Badge>
          )
        ))}
      </div>
    </div>
  );
}
