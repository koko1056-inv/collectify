
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tag, TagUpdate, ItemTag } from "@/types/tag";
import { getTagsForItem } from "@/utils/tag/item-tag-operations";
import { setItemContent } from "@/utils/tag/content-operations";
import { TagManageModalContent } from "./TagManageModalContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const firstItemId = itemIds[0];
      return await getTagsForItem(firstItemId, isUserItem);
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // If it's a user item, also fetch the original official item tags for reference
  const { data: officialItemId } = useQuery({
    queryKey: ["user-item-official-id", itemIds[0]],
    queryFn: async () => {
      if (!itemIds[0] || !isUserItem) return null;
      
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .eq("id", itemIds[0])
        .maybeSingle();
      
      if (error || !data) return null;
      return data.official_item_id;
    },
    enabled: isOpen && itemIds.length > 0 && isUserItem,
  });

  const { data: officialTags = [] } = useQuery({
    queryKey: ["official-item-tags", officialItemId],
    queryFn: async () => {
      if (!officialItemId) return [];
      return await getTagsForItem(officialItemId, false);
    },
    enabled: !!officialItemId,
  });

  const { data: itemData } = useQuery({
    queryKey: ["item-content", itemIds[0], isUserItem],
    queryFn: async () => {
      if (!itemIds[0]) return null;
      
      const table = isUserItem ? "user_items" : "official_items";
      const { data, error } = await supabase
        .from(table)
        .select("content_name")
        .eq("id", itemIds[0])
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching item content:", error);
        return null;
      }
      
      return data;
    },
    enabled: isOpen && itemIds.length > 0,
  });

  useEffect(() => {
    if (itemData && 'content_name' in itemData) {
      setContentName(itemData.content_name as string | null);
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
      for (const itemId of itemIds) {
        await setItemContent(itemId, contentName, isUserItem);
      }
      
      await queryClient.invalidateQueries({ queryKey: ["item-content"] });
      
      if (onSubmit && pendingUpdates.length > 0) {
        await onSubmit(pendingUpdates.filter((u) => u.value !== null));
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

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
              currentTags={currentTags as ItemTag[]}
              pendingUpdates={pendingUpdates}
              onTagChange={handleTagChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              contentName={contentName}
              onContentChange={handleContentChange}
              officialTags={isUserItem ? (officialTags as ItemTag[]) : []}
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
