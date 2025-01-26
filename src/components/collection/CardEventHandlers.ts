import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type TableName = "user_item_likes" | "item_memories" | "user_item_tags" | "user_items";

interface DeleteResult {
  error: Error | null;
}

export function useCardEventHandlers(id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteRelatedRecords = async (tableName: TableName): Promise<DeleteResult> => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("user_item_id", id);

    return { error: error as Error | null };
  };

  const deleteItem = async (): Promise<DeleteResult> => {
    const { error } = await supabase
      .from("user_items")
      .delete()
      .eq("id", id);

    return { error: error as Error | null };
  };

  const handleDelete = async () => {
    try {
      console.log("Starting deletion process for item:", id);

      const tablesToDelete: TableName[] = [
        "user_item_likes",
        "item_memories",
        "user_item_tags"
      ];

      for (const table of tablesToDelete) {
        const result = await deleteRelatedRecords(table);
        if (result.error) {
          console.error(`Error deleting ${table}:`, result.error);
          throw result.error;
        }
        console.log(`Successfully deleted ${table}`);
      }

      const itemResult = await deleteItem();
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