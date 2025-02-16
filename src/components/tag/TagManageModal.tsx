
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem, removeTagFromItem } from "@/utils/tag-operations";
import { ItemTag } from "@/types/tag";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  const { data: currentTags = [] } = useQuery<ItemTag[]>({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: () => {
      if (!itemIds.length) return Promise.resolve([]);
      return getTagsForItem(itemIds[0], isUserItem);
    },
  });

  const tagNames = currentTags
    .map(tag => tag.tags?.name)
    .filter((name): name is string => name !== undefined);

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const tagToRemoveObj = currentTags.find(tag => tag.tags?.name === tagToRemove);
      if (!tagToRemoveObj?.tags?.id) return;

      for (const itemId of itemIds) {
        await removeTagFromItem(tagToRemoveObj.tags.id, itemId, isUserItem);
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["current-tags", itemIds]
      });

      if (isUserItem) {
        await queryClient.invalidateQueries({ 
          queryKey: ["user-items"]
        });
      } else {
        await queryClient.invalidateQueries({ 
          queryKey: ["official-items"]
        });
      }

      toast({
        title: "タグを削除しました",
        description: `${tagToRemove}を削除しました。`,
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 p-4">
            <TagInputField 
              selectedTags={selectedTags} 
              onTagsChange={handleTagsChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              onClose={onClose}
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
              onRemove={handleRemoveTag}
            />
            <ExistingTags 
              itemIds={itemIds} 
              isUserItem={isUserItem} 
              isCategory={isCategory} 
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
