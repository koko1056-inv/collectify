
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      console.log("投稿を削除中...", postId);

      const { error } = await supabase
        .from("goods_posts")
        .delete()
        .eq("id", postId);

      if (error) {
        console.error("投稿削除エラー:", error);
        throw error;
      }
      
      console.log("投稿が削除されました:", postId);
    },
    onSuccess: () => {
      console.log("投稿削除成功、キャッシュを更新中...");
      
      // 投稿リストを更新
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.refetchQueries({ queryKey: ["posts"] });
      
      console.log("キャッシュ更新完了");
      
      toast({
        title: "投稿を削除しました",
        description: "投稿が正常に削除されました。",
      });
    },
    onError: (error) => {
      console.error("投稿削除エラー:", error);
      toast({
        title: "エラー",
        description: "投稿の削除に失敗しました。",
        variant: "destructive",
      });
    },
  });
}
