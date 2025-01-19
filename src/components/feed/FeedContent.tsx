import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "./FeedPost";
import { PostSkeleton } from "./PostSkeleton";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 10;

interface FeedPost {
  id: string;
  title: string;
  image: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  user_item_likes: Array<{
    user_id: string;
  }>;
}

interface FeedPage {
  data: FeedPost[];
  nextPage: number | null;
}

export function FeedContent() {
  const { user } = useAuth();
  const { ref, inView } = useInView();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed-posts"],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], nextPage: null };

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: followingIds } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingUserIds = followingIds?.map((f) => f.following_id) || [];
      if (followingUserIds.length === 0) return { data: [], nextPage: null };

      const { data: posts, error } = await supabase
        .from("user_items")
        .select(`
          *,
          profiles!user_items_user_id_fkey (
            username,
            avatar_url
          ),
          user_item_likes (
            user_id
          )
        `)
        .in("user_id", followingUserIds)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const hasMore = posts.length === PAGE_SIZE;
      const nextPage = hasMore ? pageParam + 1 : null;

      return {
        data: posts,
        nextPage,
      } as FeedPage;
    },
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextPage,
    enabled: !!user,
    initialPageParam: 0,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.data) || [];

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          フォローしているユーザーの投稿がまだありません
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <FeedPost key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <div ref={ref} className="py-4">
          <PostSkeleton />
        </div>
      )}
    </div>
  );
}