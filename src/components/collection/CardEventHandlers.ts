
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteUserItem } from "@/utils/tag-operations";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { invalidateCollectionChanged } from "@/utils/collection-cache";

export const useCardEventHandlers = (itemId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleDelete = async () => {
    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      // コレクションから計算している数字（コンプ進捗・登録数など）をまとめて引き直す
      void invalidateCollectionChanged(queryClient, { userId: user?.id, officialItemId });
      
      toast.success(t("collectionScreen.cardActions.itemDeleted"), {
        description: t("collectionScreen.cardActions.itemDeletedDesc"),
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      // 交換が成立して進行中の品は、サーバーが削除を止める
      const inTrade = JSON.stringify(error ?? "").includes("trade_in_progress");
      toast.error(t("collectionScreen.common.error"), {
        description: inTrade ? t("trade.errors.itemInTrade") : t("collectionScreen.cardActions.itemDeleteFailed"),
      });
    }
  };

  return {
    handleDelete,
  };
};
