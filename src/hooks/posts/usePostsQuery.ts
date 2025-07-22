
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";
import { useEffect } from "react";

export function usePosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          id,
          user_id,
          user_item_id,
          image_url,
          caption,
          created_at,
          profiles!user_id (username, avatar_url),
          user_items!user_item_id (
            title, 
            image, 
            official_item_id, 
            content_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }
      
      // 投稿のIDリストを取得してライク数を別途取得
      const postIds = data?.map(post => post.id) || [];
      let likesData = [];
      
      if (postIds.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);
          
        if (!likesError) {
          likesData = likes || [];
        }
      }
      
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "", official_item_id: null },
        post_likes: likesData.filter(like => like.post_id === post.id)
      })) as GoodsPost[];
    },
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    refetchOnWindowFocus: false,
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
          id,
          user_id,
          user_item_id,
          image_url,
          caption,
          created_at,
          profiles!user_id (username, avatar_url),
          user_items!user_item_id (title, image, official_item_id)
        `)
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const postIds = data?.map(post => post.id) || [];
      let likesData = [];
      
      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);
          
        likesData = likes || [];
      }
      
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "", official_item_id: null },
        post_likes: likesData.filter(like => like.post_id === post.id)
      })) as GoodsPost[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
