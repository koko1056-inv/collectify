
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryTagSelect } from "@/components/tag/CategoryTagSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem, updateTagsForItem } from "@/utils/tag-operations";
import { ItemTag } from "@/types/tag";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviousTags } from "./PreviousTags";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTypeTag, setSelectedTypeTag] = useState<string | null>(null);
  const [selectedCharacterTag, setSelectedCharacterTag] = useState<string | null>(null);
  const [selectedSeriesTag, setSelectedSeriesTag] = useState<string | null>(null);
  const [otherTags, setOtherTags] = useState<string[]>([]);
  
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  const { data: currentTags = [] } = useQuery<ItemTag[]>({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: async () => {
      if (!itemIds.length) return Promise.resolve([]);
      return getTagsForItem(itemIds[0], isUserItem);
    },
  });

  // 初期値をセット
  useEffect(() => {
    if (currentTags.length > 0) {
      currentTags.forEach(tag => {
        if (tag.tags) {
          switch (tag.tags.category) {
            case 'type':
              setSelectedTypeTag(tag.tag_id);
              break;
            case 'character':
              setSelectedCharacterTag(tag.tag_id);
              break;
            case 'series':
              setSelectedSeriesTag(tag.tag_id);
              break;
            case 'other':
              setOtherTags(prev => [...prev, tag.tag_id]);
              break;
          }
        }
      });
    }
  }, [currentTags]);

  const handleUpdate = async () => {
    try {
      const allSelectedTagIds = [
        selectedTypeTag,
        selectedCharacterTag,
        selectedSeriesTag,
        ...otherTags
      ].filter((tagId): tagId is string => tagId !== null);

      for (const itemId of itemIds) {
        await updateTagsForItem(itemId, allSelectedTagIds, isUserItem);
      }

      await queryClient.invalidateQueries({
        queryKey: ["current-tags", itemIds]
      });

      toast({
        title: "タグを更新しました",
        description: "タグの更新が完了しました。",
      });

      onClose();
    } catch (error) {
      console.error("Error updating tags:", error);
      toast({
        title: "エラー",
        description: "タグの更新に失敗しました。",
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
            <div className="space-y-6">
              <CategoryTagSelect
                category="type"
                label="グッズタイプ"
                value={selectedTypeTag}
                onChange={setSelectedTypeTag}
              />
              <CategoryTagSelect
                category="character"
                label="キャラクター・人物名"
                value={selectedCharacterTag}
                onChange={setSelectedCharacterTag}
              />
              <CategoryTagSelect
                category="series"
                label="グッズシリーズ"
                value={selectedSeriesTag}
                onChange={setSelectedSeriesTag}
              />
              <div className="space-y-4">
                <TagInput 
                  selectedTags={otherTags}
                  onTagsChange={setOtherTags}
                  itemIds={itemIds}
                  onClose={onClose}
                  category="other"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleUpdate}>
                更新
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
