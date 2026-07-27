
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { deleteUserItem } from '@/utils/tag/user-item-operations';
import { useLanguage } from '@/contexts/LanguageContext';

export function useItemDetailsActions(
  itemId: string,
  onClose: () => void,
) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
      
      toast.success(t("itemDetails.remove.success"), {
        description: t("itemDetails.remove.successDescription"),
      });

      onClose();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.remove.failed"),
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
