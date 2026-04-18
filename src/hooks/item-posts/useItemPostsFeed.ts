import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ItemPost } from "./useItemPosts";

export type FeedMode = "new" | "popular" | "following";

/**
 * 全投稿フィード。モード別:
 *  - new: 新着順
 *  - popular: 7日以内 × like降順
 *  - following: フォローしているユーザーの投稿のみ
 */
export function useItemPostsFeed({
  mode = "new",
  contentFilter,
  hashtag,
  limit = 30,
}: {
  mode?: FeedMode;
  contentFilter?: string | null;
  hashtag?: string | null;
  limit?: number;
} = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["item-posts-feed", mode, contentFilter, hashtag, user?.id, limit],
    queryFn: async (): Promise<ItemPost[]> => {
      let query = supabase
        .from("item_posts")
        .select(
          `
          *,
          images:item_post_images ( id, image_url, display_order ),
          profile:profiles ( id, username, display_name, avatar_url )
        `
        )
        .limit(limit);

      // モード別ソート/フィルター
      if (mode === "popular") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("like_count", { ascending: false })
          .order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // following モード
      if (mode === "following" && user?.id) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        const ids = (follows || []).map((f) => f.following_id);
        if (ids.length === 0) return [];
        query = query.in("user_id", ids);
      }

      // ハッシュタグ検索
      if (hashtag) {
        query = query.ilike("caption", `%#${hashtag}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let posts = (data || []) as any[];

      // コンテンツ名フィルタ（official_items or user_items 経由で filter）
      if (contentFilter) {
        const officialIds = posts
          .map((p) => p.official_item_id)
          .filter(Boolean) as string[];
        const userItemIds = posts
          .map((p) => p.user_item_id)
          .filter(Boolean) as string[];

        const [officialRes, userRes] = await Promise.all([
          officialIds.length
            ? supabase
                .from("official_items")
                .select("id, content_name")
                .in("id", officialIds)
                .eq("content_name", contentFilter)
            : Promise.resolve({ data: [] as any[] }),
          userItemIds.length
            ? supabase
                .from("user_items")
                .select("id, content_name")
                .in("id", userItemIds)
                .eq("content_name", contentFilter)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const matchingOfficial = new Set(officialRes.data?.map((r: any) => r.id) || []);
        const matchingUser = new Set(userRes.data?.map((r: any) => r.id) || []);
        posts = posts.filter(
          (p) =>
            (p.official_item_id && matchingOfficial.has(p.official_item_id)) ||
            (p.user_item_id && matchingUser.has(p.user_item_id))
        );
      }

      // 自分のいいね状態を一括取得
      let likedIds = new Set<string>();
      if (user?.id && posts.length > 0) {
        const { data: likes } = await supabase
          .from("item_post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in(
            "post_id",
            posts.map((p) => p.id)
          );
        likedIds = new Set((likes || []).map((l) => l.post_id));
      }

      return posts.map((p) => ({
        ...p,
        images: (p.images || []).sort(
          (a: any, b: any) => a.display_order - b.display_order
        ),
        is_liked_by_me: likedIds.has(p.id),
      }));
    },
  });
}
