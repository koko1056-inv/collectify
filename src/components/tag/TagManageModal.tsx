
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tag, TagUpdate } from "@/types/tag";
import { getTagsForItem, addTagToItem, removeTagFromItem } from "@/utils/tag/item-tag-operations";
import { setItemContent } from "@/utils/tag/content-operations";
import { TagManageModalContent } from "./TagManageModalContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string;
  isUserItem?: boolean;
  onSubmit?: (updates: TagUpdate[]) => Promise<void>;
}

// Define a simplified ItemTag interface to use in this component
interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemIds,
  title = "タグ管理",
  itemTitle,
  isUserItem = true,
  onSubmit,
}: TagManageModalProps) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [contentName, setContentName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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

  // タグを更新する関数
  const updateTagsByCategory = async (itemId: string, category: string, tagName: string | null) => {
    if (!tagName) return;
    
    try {
      // カテゴリに対応するタグを探す
      const existingCategoryTag = currentTags.find(tag => 
        tag.tags?.category === category
      );

      // 既存のタグを削除
      if (existingCategoryTag) {
        await removeTagFromItem(existingCategoryTag.tag_id, itemId, isUserItem);
      }

      // 新しいタグの追加
      // タグIDを取得
      const { data: tagData } = await supabase
        .from("tags")
        .select("id")
        .eq("name", tagName)
        .eq("category", category)
        .maybeSingle();

      if (tagData && tagData.id) {
        await addTagToItem(itemId, tagData.id, isUserItem);
      }
    } catch (error) {
      console.error(`Error updating tag for category ${category}:`, error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      // コンテンツ名を各アイテムに設定
      for (const itemId of itemIds) {
        await setItemContent(itemId, contentName, isUserItem);
      }
      
      // タグの更新を各アイテムに対して実行
      for (const itemId of itemIds) {
        for (const update of pendingUpdates) {
          if (update.value) {
            await updateTagsByCategory(itemId, update.category, update.value);
          }
        }
      }
      
      // キャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ["item-content"] });
      await queryClient.invalidateQueries({ queryKey: ["current-tags"] });
      await queryClient.invalidateQueries({ queryKey: ["user-item-tags"] });
      
      // onSubmitコールバックがあれば呼び出し
      if (onSubmit && pendingUpdates.length > 0) {
        await onSubmit(pendingUpdates.filter((u) => u.value !== null));
      }
      
      toast({
        title: "保存完了",
        description: "タグの設定を保存しました",
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "タグの保存中にエラーが発生しました",
        variant: "destructive",
      });
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
              currentTags={currentTags as SimpleItemTag[]}
              pendingUpdates={pendingUpdates}
              onTagChange={handleTagChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              contentName={contentName}
              onContentChange={handleContentChange}
              officialTags={isUserItem ? (officialTags as SimpleItemTag[]) : []}
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
