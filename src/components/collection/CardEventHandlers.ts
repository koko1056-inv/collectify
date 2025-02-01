import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useCardEventHandlers(id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteRelatedRecords = async (tableName: string): Promise<{ error: any; operation: string }> => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("user_item_id", id);

    return {
      error,
      operation: tableName
    };
  };

  const deleteItem = async (): Promise<{ error: any; operation: string }> => {
    const { error } = await supabase
      .from("user_items")
      .delete()
      .eq("id", id);

    return {
      error,
      operation: "user_items"
    };
  };

  const handleDelete = async () => {
    try {
      console.log("Starting deletion process for item:", id);

      const operations = [
        { name: "user_item_likes", label: "likes" },
        { name: "item_memories", label: "memories" },
        { name: "user_item_tags", label: "tags" }
      ];

      for (const op of operations) {
        const result = await deleteRelatedRecords(op.name);
        if (result.error) {
          console.error(`Error deleting ${op.label}:`, result.error);
          throw result.error;
        }
        console.log(`Successfully deleted ${op.label}`);
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