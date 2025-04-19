
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { deleteUserItem } from '@/utils/tag/user-item-operations';

export function useItemDetailsActions(
  itemId: string,
  onClose: () => void,
) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDeleteItem = async () => {
    if (!itemId) return;
    
    setIsSaving(true);
    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      if (officialItemId) {
        queryClient.invalidateQueries({ 
          queryKey: ["user-item-exists", officialItemId] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["item-owners-count", officialItemId] 
        });
      }
      
      toast({
        title: "アイテムを削除しました",
        description: "コレクションからアイテムを削除しました。",
      });
      
      onClose();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isTagModalOpen,
    setIsTagModalOpen,
    isSaving,
    handleDeleteItem,
  };
}
