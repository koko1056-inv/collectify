import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";
import { useEffect } from "react";

const POSTS_PER_PAGE = 20;

export function usePostsWithPagination() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["posts", "paginated"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

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
          ),
          post_likes (id, user_id),
          post_comments (id)
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw error;
      }

      const posts = (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "", official_item_id: null },
        post_likes: post.post_likes || [],
        post_comments: post.post_comments || []
      })) as GoodsPost[];

      return {
        posts,
        nextCursor: data && data.length === POSTS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    refetchOnWindowFocus: false,
  });

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime-paginated')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goods_posts'
        },
        () => {
          // 新しい投稿があった場合、最初のページをリフレッシュ
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["posts", "paginated"] });
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}