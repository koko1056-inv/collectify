
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { PostDeleteNotAllowedError } from "@/hooks/item-posts/useItemPosts";

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (postId: string) => {
      // RLS で止められた削除はエラーにならず 0 行で返る。消えた行を返してもらい、0 行なら失敗にする
      const { data, error } = await supabase
        .from("goods_posts")
        .delete()
        .eq("id", postId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) throw new PostDeleteNotAllowedError();
    },
    // 0 行（消す権限がない）は何度やっても同じなので、通信の失敗のときだけ 1 回やり直す
    retry: (count, e) => !(e instanceof PostDeleteNotAllowedError) && count < 1,
    onSuccess: () => {
      // グッズ詳細の「投稿」（useItemPosts は ["item-posts", userItemId]）と、ほかの goods_posts の一覧
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["posts-for-item"] });
      queryClient.invalidateQueries({ queryKey: ["item-posts"] });

      toast.success(t("notices.posts.deletedTitle"), {
        description: t("notices.posts.deletedDesc"),
      });
    },
    onError: (error) => {
      console.error("投稿削除エラー:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t(
          error instanceof PostDeleteNotAllowedError ? "notices.itemPosts.deleteNotAllowed" : "notices.posts.deleteFailedDesc"
        ),
      });
    },
  });
}
