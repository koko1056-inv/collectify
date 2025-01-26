import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CardEventHandlersProps {
  id: string;
  userId?: string;
}

export const useCardEventHandlers = ({ id, userId }: CardEventHandlersProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await queryClient.invalidateQueries({ 
        queryKey: ["user-items", userId]
      });

      toast({
        title: "削除完了",
        description: "アイテムを削除しました",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  return {
    handleDelete,
  };
};