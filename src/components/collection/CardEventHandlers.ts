import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { deleteUserItem, deleteRelatedRecords } from "@/utils/tag-operations";
import { TableName } from "@/types/tag";

export const useCardEventHandlers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      const tables: TableName[] = ["user_item_likes", "item_memories", "user_item_tags"];
      
      for (const table of tables) {
        const { error } = await deleteRelatedRecords(table, id);
        if (error) throw error;
      }

      const { error: deleteError } = await deleteUserItem(id);
      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "アイテムを削除しました",
        description: "コレクションからアイテムを削除しました。",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    handleDelete,
  };
};