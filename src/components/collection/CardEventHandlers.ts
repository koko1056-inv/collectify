import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const TABLES = {
  USER_ITEM_LIKES: "user_item_likes",
  ITEM_MEMORIES: "item_memories",
  USER_ITEM_TAGS: "user_item_tags",
  USER_ITEMS: "user_items",
} as const;

type TableName = typeof TABLES[keyof typeof TABLES];

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
      .from(TABLES.USER_ITEMS)
      .delete()
      .eq("id", id);

    return { error: error as Error | null };
  };

  const handleDelete = async () => {
    try {
      const tablesToDelete: TableName[] = [
        TABLES.USER_ITEM_LIKES,
        TABLES.ITEM_MEMORIES,
        TABLES.USER_ITEM_TAGS
      ];

      for (const table of tablesToDelete) {
        const result = await deleteRelatedRecords(table);
        if (result.error) {
          console.error(`Error deleting ${table}:`, result.error);
          throw result.error;
        }
      }

      const itemResult = await deleteItem();
      if (itemResult.error) {
        console.error("Error deleting item:", itemResult.error);
        throw itemResult.error;
      }

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