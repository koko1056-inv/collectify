import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// Define table names using a const assertion to prevent type recursion
const TABLE_NAMES = ['user_item_likes', 'item_memories', 'user_item_tags', 'user_items'] as const;
type TableName = (typeof TABLE_NAMES)[number];

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
      .from('user_items')
      .delete()
      .eq("id", id);

    return { error: error as Error | null };
  };

  const handleDelete = async () => {
    try {
      // Delete related records first
      const tablesToDelete: TableName[] = ['user_item_likes', 'item_memories', 'user_item_tags'];
      
      for (const table of tablesToDelete) {
        const result = await deleteRelatedRecords(table);
        if (result.error) {
          console.error(`Error deleting ${table}:`, result.error);
          throw result.error;
        }
      }

      // Delete the item itself
      const itemResult = await deleteItem();
      if (itemResult.error) {
        console.error("Error deleting item:", itemResult.error);
        throw itemResult.error;
      }

      // Update cache
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