
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";

export function useItemPosts(userItemId: string) {
  return useQuery({
    queryKey: ["item-posts", userItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_posts")
        .select(`
          *,
          profiles!goods_posts_user_id_fkey (username, avatar_url),
          user_items!goods_posts_user_item_id_fkey (title, image),
          post_likes (id, user_id)
        `)
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "" },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
    enabled: !!userItemId,
    // より頻繁にリフェッチして最新状態を保つ
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
