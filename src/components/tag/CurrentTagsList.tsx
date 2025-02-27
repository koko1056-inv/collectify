
import { Badge } from "@/components/ui/badge";
import { ItemTag } from "@/types/tag";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurrentTagsListProps {
  currentTags: ItemTag[];
  onRemoveTag?: (tagId: string) => void;
}

export function CurrentTagsList({ currentTags, onRemoveTag }: CurrentTagsListProps) {
  if (currentTags.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium mb-2">現在のタグ:</h3>
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tag) => (
          tag.tags && (
            <Badge 
              key={tag.tag_id} 
              variant="secondary" 
              className="text-sm pr-2 flex items-center gap-1"
            >
              {tag.tags.name}
              {onRemoveTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0.5 hover:bg-transparent"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveTag(tag.tag_id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          )
        ))}
      </div>
    </div>
  );
}
