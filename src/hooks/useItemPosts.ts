
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";
import { useEffect } from "react";

export function useItemPosts(userItemId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["item-posts", userItemId],
    queryFn: async () => {
      console.log("アイテム固有の投稿を取得中:", userItemId);
      
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles (username, avatar_url),
          user_items (title, image),
          post_likes (id, user_id)
        `)
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("アイテム投稿取得エラー:", error);
        throw error;
      }
      
      console.log("取得したアイテム投稿データ:", data);
      
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "" },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
    enabled: !!userItemId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // アイテム固有の投稿のリアルタイム更新
  useEffect(() => {
    if (!userItemId) return;

    const channel = supabase
      .channel(`item-posts-${userItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goods_posts',
          filter: `user_item_id=eq.${userItemId}`
        },
        () => {
          console.log("アイテム投稿データに変更を検知、リフェッチします");
          queryClient.invalidateQueries({ queryKey: ["item-posts", userItemId] });
          queryClient.refetchQueries({ queryKey: ["item-posts", userItemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userItemId, queryClient]);

  return query;
}
