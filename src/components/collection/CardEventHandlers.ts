import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useCardEventHandlers(id: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      console.log("Starting deletion process for item:", id);

      // First delete all likes
      const { error: likesError } = await supabase
        .from("user_item_likes")
        .delete()
        .eq("user_item_id", id);

      if (likesError) {
        console.error("Error deleting likes:", likesError);
        throw likesError;
      }

      // Then delete memories
      const { error: memoriesError } = await supabase
        .from("item_memories")
        .delete()
        .eq("user_item_id", id);

      if (memoriesError) {
        console.error("Error deleting memories:", memoriesError);
        throw memoriesError;
      }

      // Then delete item tags
      const { error: tagsError } = await supabase
        .from("user_item_tags")
        .delete()
        .eq("user_item_id", id);

      if (tagsError) {
        console.error("Error deleting tags:", tagsError);
        throw tagsError;
      }

      // Finally delete the item itself
      const { error: itemError } = await supabase
        .from("user_items")
        .delete()
        .eq("id", id);

      if (itemError) {
        console.error("Error deleting item:", itemError);
        throw itemError;
      }

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
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

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
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