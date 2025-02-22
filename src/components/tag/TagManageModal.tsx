
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem, ItemTag } from "@/utils/tag-operations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagManageModalContent } from "./TagManageModalContent";
import { TagUpdate } from "@/types/tag";

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
          // まず、タグが存在するか確認
          const { data: existingTag, error: tagError } = await supabase
            .from("tags")
            .select("id")
            .eq("name", update.value)
            .eq("category", update.category)
            .maybeSingle();

          if (tagError) throw tagError;

          let tagId;
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // 新しいタグを作成
            const { data: newTag, error: createError } = await supabase
              .from("tags")
              .insert([{
                name: update.value,
                category: update.category
              }])
              .select()
              .single();

            if (createError) throw createError;
            tagId = newTag.id;
          }

          // UPSERTを使用して重複を防ぐ
          const insertData = isUserItem 
            ? { user_item_id: itemIds[0], tag_id: tagId }
            : { official_item_id: itemIds[0], tag_id: tagId };

          const { error: insertError } = await supabase
            .from(isUserItem ? "user_item_tags" : "item_tags")
            .upsert([insertData], {
              onConflict: isUserItem ? 'user_item_id,tag_id' : 'official_item_id,tag_id'
            });

          if (insertError) throw insertError;
        }
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["current-tags", itemIds]
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ["user-items"]
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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] sm:h-auto p-0">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-4 sm:px-6">
          <TagManageModalContent
            currentTags={currentTags}
            pendingUpdates={pendingUpdates}
            onTagChange={handleTagChange}
            itemIds={itemIds}
            isUserItem={isUserItem}
          />
        </ScrollArea>

        <div className="flex justify-end space-x-2 p-4 sm:p-6 border-t">
          <Button variant="outline" onClick={onClose} size="sm" className="h-8 sm:h-10">
            キャンセル
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !pendingUpdates.length}
            size="sm"
            className="h-8 sm:h-10"
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
