
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoodsPost } from "@/types/posts";
import { useAuth } from "@/contexts/AuthContext";
import { excludeBlocked, fetchBlockedUserIds } from "@/hooks/useBlocks";

export function useItemPosts(userItemId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      
      const blocked = await fetchBlockedUserIds(queryClient, user?.id);
      return excludeBlocked(data || [], blocked, (post) => post.user_id).map(post => ({
        ...post,
        profiles: post.profiles || { username: "Unknown", avatar_url: null },
        user_items: post.user_items || { title: "Unknown", image: "" },
        post_likes: post.post_likes || []
      })) as GoodsPost[];
    },
    enabled: !!userItemId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
  });

  return query;
}
