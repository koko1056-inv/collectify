
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";
import { useEffect } from "react";

export function usePosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      console.log("投稿を取得中...");
      
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles (username, avatar_url),
          user_items (
            title, 
            image, 
            official_item_id, 
            content_name,
            user_item_tags (
              tags (id, name)
            )
          ),
          post_likes (id, user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("投稿取得エラー:", error);
        throw error;
      }
      
      console.log("取得した投稿データ:", data);
      
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "", official_item_id: null },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
    gcTime: 5 * 60 * 1000, // 5分間キャッシュを保持
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動リフェッチを無効
  });

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goods_posts'
        },
        () => {
          console.log("投稿データに変更を検知、リフェッチします");
          // 即座にリフェッチする代わりに、少し遅延を入れてバッチ処理する
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments'
        },
        () => {
          console.log("コメントデータに変更を検知、コメントクエリをリフェッチします");
          queryClient.invalidateQueries({ queryKey: ["comments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function usePostsForItem(userItemId: string) {
  return useQuery({
    queryKey: ["posts", "item", userItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles (username, avatar_url),
          user_items (title, image, official_item_id),
          post_likes (id, user_id)
        `)
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "", official_item_id: null },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
  });
}
