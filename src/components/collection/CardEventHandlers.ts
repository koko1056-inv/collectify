import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// テーブル名を列挙型として定義
enum TableName {
  USER_ITEM_LIKES = "user_item_likes",
  ITEM_MEMORIES = "item_memories",
  USER_ITEM_TAGS = "user_item_tags",
  USER_ITEMS = "user_items"
}

// 削除操作の結果型を定義
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
      .from(TableName.USER_ITEMS)
      .delete()
      .eq("id", id);

    return { error: error as Error | null };
  };

  const handleDelete = async () => {
    try {
      // 削除するテーブルを配列として定義
      const tablesToDelete: readonly TableName[] = [
        TableName.USER_ITEM_LIKES,
        TableName.ITEM_MEMORIES,
        TableName.USER_ITEM_TAGS
      ];

      // 関連レコードの削除
      for (const table of tablesToDelete) {
        const result = await deleteRelatedRecords(table);
        if (result.error) {
          console.error(`Error deleting ${table}:`, result.error);
          throw result.error;
        }
      }

      // アイテム自体の削除
      const itemResult = await deleteItem();
      if (itemResult.error) {
        console.error("Error deleting item:", itemResult.error);
        throw itemResult.error;
      }

      // キャッシュの更新
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