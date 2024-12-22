import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCardEventHandlers = (id: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "削除完了",
        description: "アイテムをコレクションから削除しました。",
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

  const handleShareToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ is_shared: checked })
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: checked ? "共有設定完了" : "非公開設定完了",
        description: checked ? "アイテムを共有しました。" : "アイテムを非公開にしました。",
      });
    } catch (error) {
      console.error("Error updating share status:", error);
      toast({
        title: "エラー",
        description: "共有設定の更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    handleDelete,
    handleShareToggle,
  };
};