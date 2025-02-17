
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem } from "@/utils/tag-operations";
import { ItemTag } from "@/types/tag";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTagSelect } from "./CategoryTagSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

interface TagUpdate {
  category: string;
  value: string | null;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
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

  const handleTagChange = (category: string) => (value: string | null) => {
    setPendingUpdates(prev => [
      ...prev.filter(update => update.category !== category),
      { category, value }
    ]);
  };

  const handleSave = async () => {
    if (!itemIds.length || !pendingUpdates.length) return;
    setIsSaving(true);

    try {
      for (const update of pendingUpdates) {
        // 同じカテゴリの古いタグを削除
        const oldTag = currentTags.find(tag => tag.tags?.category === update.category);
        if (oldTag) {
          await supabase
            .from(isUserItem ? "user_item_tags" : "item_tags")
            .delete()
            .eq("tag_id", oldTag.tag_id)
            .eq(isUserItem ? "user_item_id" : "official_item_id", itemIds[0]);
        }

        // 新しいタグを追加
        if (update.value) {
          const insertData = isUserItem 
            ? { user_item_id: itemIds[0], tag_id: update.value }
            : { official_item_id: itemIds[0], tag_id: update.value };

          await supabase
            .from(isUserItem ? "user_item_tags" : "item_tags")
            .insert(insertData);
        }
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["current-tags", itemIds]
      });

      setPendingUpdates([]);
      toast({
        title: "タグを更新しました",
        description: "アイテムのタグが正常に更新されました。",
      });
      onClose();
    } catch (error) {
      console.error("Failed to update tags:", error);
      toast({
        title: "エラー",
        description: "タグの更新中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
            <div className="space-y-4">
              <CategoryTagSelect
                category="character"
                label="キャラクター・人物名"
                value={currentTags.find(tag => tag.tags?.category === 'character')?.tags?.id || null}
                onChange={handleTagChange("character")}
              />
              <CategoryTagSelect
                category="type"
                label="グッズタイプ"
                value={currentTags.find(tag => tag.tags?.category === 'type')?.tags?.id || null}
                onChange={handleTagChange("type")}
              />
              <CategoryTagSelect
                category="series"
                label="グッズシリーズ"
                value={currentTags.find(tag => tag.tags?.category === 'series')?.tags?.id || null}
                onChange={handleTagChange("series")}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving || !pendingUpdates.length}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
