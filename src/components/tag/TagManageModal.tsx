
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ItemTag } from "@/types/tag";
import { getTagsForItem } from "@/utils/tag-operations";
import { TagManageModalContent } from "./TagManageModalContent";
import { useQuery } from "@tanstack/react-query";

interface TagUpdate {
  category: string;
  value: string | null;
}

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string; // 追加：オプショナルなitemTitleプロパティ
  isUserItem?: boolean;
  onSubmit?: (updates: TagUpdate[]) => Promise<void>;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemIds,
  title = "タグ管理",
  itemTitle, // 追加：パラメータを受け取る
  isUserItem = false,
  onSubmit,
}: TagManageModalProps) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  
  const { data: currentTags = [], isLoading } = useQuery({
    queryKey: ["current-tags", itemIds],
    queryFn: async () => {
      // 複数アイテムの場合は最初のIDのタグを取得
      const firstItemId = itemIds[0];
      return await getTagsForItem(firstItemId, isUserItem);
    },
    enabled: isOpen && itemIds.length > 0,
  });

  useEffect(() => {
    if (!isOpen) {
      setPendingUpdates([]);
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

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(pendingUpdates.filter((u) => u.value !== null));
    }
    onClose();
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
