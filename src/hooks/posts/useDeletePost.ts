
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
      
      toast.success(t("notices.posts.deletedTitle"), {
        description: t("notices.posts.deletedDesc"),
      });
    },
    onError: (error) => {
      console.error("投稿削除エラー:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.posts.deleteFailedDesc"),
      });
    },
  });
}
