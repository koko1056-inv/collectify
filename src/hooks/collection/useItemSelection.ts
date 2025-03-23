
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserItem } from "@/types";

export function useItemSelection(userId: string | null | undefined, selectedTags: string[]) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const queryClient = useQueryClient();

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const handleBulkThemeAssign = (
    items: UserItem[], 
    setDialogData: (data: any) => void
  ) => {
    if (selectedItems.length === 0) return;
    
    // 選択されたアイテムの最初のアイテムでダイアログを開く
    const firstItem = items.find(item => item.id === selectedItems[0]);
    if (firstItem) {
      setDialogData({
        isOpen: true,
        itemId: "bulk", // 一括操作用の特殊ID
        itemTitle: `選択した${selectedItems.length}個のアイテム`,
        currentTheme: null,
      });
    }
  };

  // 一括テーマ変更
  const handleBulkAssignTheme = async (theme: string | null) => {
    if (!userId || selectedItems.length === 0) return;
    
    try {
      // 選択された全アイテムのテーマを変更
      await Promise.all(
        selectedItems.map(itemId => 
          supabase
            .from("user_items")
            .update({ theme: theme })
            .eq("id", itemId)
            .eq("user_id", userId)
        )
      );
      
      queryClient.invalidateQueries({ queryKey: ["user-items", userId, selectedTags] });
      toast.success(`${selectedItems.length}個のアイテムのテーマを更新しました`);
      setSelectedItems([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error("テーマの一括更新に失敗しました:", error);
      toast.error("テーマの一括更新に失敗しました");
    }
  };

  return {
    selectedItems,
    setSelectedItems,
    isSelectionMode,
    setIsSelectionMode,
    handleSelectItem,
    handleBulkThemeAssign,
    handleBulkAssignTheme
  };
}
