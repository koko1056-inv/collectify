import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface DeleteOperationResult {
  error: any;
  operation: string;
}

export function useCardEventHandlers(id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteRelatedRecords = async (tableName: string): Promise<DeleteOperationResult> => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("user_item_id", id);

    return {
      error,
      operation: tableName
    };
  };

  const deleteItem = async (): Promise<DeleteOperationResult> => {
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

      // Delete in specific order due to foreign key constraints
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

      // Finally delete the main item
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

  const handleShareToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ is_shared: checked })
        .eq("id", id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      toast({
        title: checked ? "公開設定を変更" : "非公開設定を変更",
        description: checked ? "コレクションを公開しました。" : "コレクションを非公開にしました。",
      });
    } catch (error) {
      console.error("Error toggling share:", error);
      toast({
        title: "エラー",
        description: "公開設定の変更に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    handleDelete,
    handleShareToggle,
  };
}