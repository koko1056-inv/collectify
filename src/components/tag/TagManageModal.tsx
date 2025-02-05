import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";
import { useQuery } from "@tanstack/react-query";
import { getTagsForItem } from "@/utils/tag-operations";
import { ItemTag } from "@/types/tag";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  const { data: currentTags = [] } = useQuery<ItemTag[]>({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: async () => {
      if (!itemIds.length) return [];
      return getTagsForItem(itemIds[0], isUserItem);
    },
  });

  const tagNames = currentTags
    .map(tag => tag.tags?.name)
    .filter((name): name is string => name !== undefined);

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <TagInputField 
            selectedTags={selectedTags} 
            onTagsChange={handleTagsChange}
          />
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">追加予定のタグ</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <CurrentTags 
            tags={tagNames}
            onRemove={(tag: string) => console.log('Remove tag:', tag)} 
          />
          <ExistingTags itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}