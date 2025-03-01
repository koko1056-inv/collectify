
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ItemTag } from "@/types/tag";
import { getTagsForItem, setItemContent } from "@/utils/tag-operations";
import { TagManageModalContent } from "./TagManageModalContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagUpdate {
  category: string;
  value: string | null;
}

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string;
  isUserItem?: boolean;
  onSubmit?: (updates: TagUpdate[]) => Promise<void>;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemIds,
  title = "タグ管理",
  itemTitle,
  isUserItem = false,
  onSubmit,
}: TagManageModalProps) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [contentName, setContentName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { data: currentTags = [], isLoading } = useQuery({
    queryKey: ["current-tags", itemIds],
    queryFn: async () => {
      // 複数アイテムの場合は最初のIDのタグを取得
      const firstItemId = itemIds[0];
      return await getTagsForItem(firstItemId, isUserItem);
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // 現在のコンテンツ名を取得
  const { data: itemData } = useQuery({
    queryKey: ["item-content", itemIds[0], isUserItem],
    queryFn: async () => {
      if (!itemIds[0]) return null;
      
      const table = isUserItem ? "user_items" : "official_items";
      const { data, error } = await supabase
        .from(table)
        .select("content_name")
        .eq("id", itemIds[0])
        .single();
      
      if (error) {
        console.error("Error fetching item content:", error);
        return null;
      }
      
      return data;
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // コンテンツ名の初期設定
  useEffect(() => {
    // Add a null check for itemData before trying to access it
    if (itemData && typeof itemData === 'object' && 'content_name' in itemData) {
      setContentName((itemData as { content_name: string | null }).content_name);
    }
  }, [itemData]);

  useEffect(() => {
    if (!isOpen) {
      setPendingUpdates([]);
      setContentName(null);
    }
  }, [isOpen]);

  const handleTagChange = useCallback((category: string) => (value: string | null) => {
    setPendingUpdates((prev) => {
      const existing = prev.findIndex((u) => u.category === category);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { category, value };
        return updated;
      }
      return [...prev, { category, value }];
    });
  }, []);

  const handleContentChange = useCallback((newContentName: string | null) => {
    setContentName(newContentName);
  }, []);

  const handleSubmit = async () => {
    try {
      // コンテンツ名を更新
      for (const itemId of itemIds) {
        await setItemContent(itemId, contentName, isUserItem);
      }
      
      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["item-content"] });
      
      // タグ更新がある場合はそちらも処理
      if (onSubmit && pendingUpdates.length > 0) {
        await onSubmit(pendingUpdates.filter((u) => u.value !== null));
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // itemTitleがある場合はタイトルに含める
  const modalTitle = itemTitle ? `${title}: ${itemTitle}` : title;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-4 text-center">読み込み中...</div>
        ) : (
          <>
            <TagManageModalContent
              currentTags={currentTags}
              pendingUpdates={pendingUpdates}
              onTagChange={handleTagChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              contentName={contentName}
              onContentChange={handleContentChange}
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit}>
                保存
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
