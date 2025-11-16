
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSoundEffect } from "@/hooks/useSoundEffect";

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userItemId, caption, imageUrl }: { 
      userItemId: string; 
      caption?: string; 
      imageUrl: string; 
    }) => {
      if (!user) throw new Error("ログインが必要です");

      console.log("投稿を作成中...", { userItemId, caption, imageUrl });

      const { data, error } = await supabase
        .from("goods_posts")
        .insert({
          user_id: user.id,
          user_item_id: userItemId,
          caption,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error("投稿作成エラー:", error);
        throw error;
      }
      
      console.log("投稿が作成されました:", data);
      return data;
    },
    onSuccess: async (newPost) => {
      console.log("投稿作成成功、キャッシュを更新中...");
      
      // すべての関連クエリを無効化
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["item-posts", newPost.user_item_id] });
      
      // 強制的にリフェッチを実行
      await queryClient.refetchQueries({ queryKey: ["posts"] });
      await queryClient.refetchQueries({ queryKey: ["item-posts", newPost.user_item_id] });
      
      console.log("キャッシュ更新完了");
      
      toast({
        title: "投稿しました",
        description: "投稿が正常に作成されました。",
      });
    },
    onError: (error) => {
      console.error("投稿作成エラー:", error);
      toast({
        title: "エラー",
        description: "投稿の作成に失敗しました。",
        variant: "destructive",
      });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { playLikeSound } = useSoundEffect();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error("ログインが必要です");

      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        if (error) throw error;
        
        // いいね追加時に効果音と振動を再生
        playLikeSound();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["item-posts"] });
    },
  });
}
