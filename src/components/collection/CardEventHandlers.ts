import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { deleteItem, deleteRelatedRecords } from "@/utils/tag-operations";
import { TableName } from "@/types/tag";

export function useCardEventHandlers(id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      console.log("Starting deletion process for item:", id);

      const operations: Array<{ name: TableName; label: string }> = [
        { name: "user_item_likes", label: "likes" },
        { name: "item_memories", label: "memories" },
        { name: "user_item_tags", label: "tags" }
      ];

      for (const op of operations) {
        const result = await deleteRelatedRecords(op.name, id);
        if (result.error) {
          console.error(`Error deleting ${op.label}:`, result.error);
          throw result.error;
        }
        console.log(`Successfully deleted ${op.label}`);
      }

      const itemResult = await deleteItem(id);
      if (itemResult.error) {
        console.error("Error deleting item:", itemResult.error);
        throw itemResult.error;
      }
      console.log("Successfully deleted item");

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "削除完了",
        description: "コレクションを削除しました。",
      });
    } catch (error) {
      console.error("Error in deletion process:", error);
      toast({
        title: "エラー",
        description: "コレクションの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    handleDelete,
  };
}