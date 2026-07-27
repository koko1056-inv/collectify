
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteUserItem } from "@/utils/tag-operations";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export const useCardEventHandlers = (itemId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleDelete = async () => {
    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      // Invalidate user items query
      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      // Invalidate specific official item query if we have the ID
      if (officialItemId) {
        queryClient.invalidateQueries({ 
          queryKey: ["user-item-exists", officialItemId, user?.id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["item-owners-count", officialItemId] 
        });
      }
      
      toast.success(t("collectionScreen.cardActions.itemDeleted"), {
        description: t("collectionScreen.cardActions.itemDeletedDesc"),
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.cardActions.itemDeleteFailed"),
      });
    }
  };

  return {
    handleDelete,
  };
};
