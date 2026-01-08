import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Heart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RankingUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  likes_count: number;
  posts_count: number;
}

interface RankingPost {
  post_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export function WeeklyRanking() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 週間人気投稿
  const { data: topPosts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["weekly-top-posts"],
    queryFn: async () => {
      // 過去1週間のいいね数でソート
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .gte("created_at", oneWeekAgo.toISOString());

      if (likesError) throw likesError;

      // いいね数をカウント
      const likesCount: Record<string, number> = {};
      likesData?.forEach((like) => {
        likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
      });

      // 上位5件の投稿IDを取得
      const topPostIds = Object.entries(likesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([postId]) => postId);

      if (topPostIds.length === 0) return [];

      // 投稿詳細を取得
      const { data: posts, error: postsError } = await supabase
        .from("goods_posts")
        .select(`
          id,
          image_url,
          caption,
          user_id,
          profiles:user_id (username, avatar_url)
        `)
        .in("id", topPostIds);

      if (postsError) throw postsError;

      return topPostIds.map((postId) => {
        const post = posts?.find((p) => p.id === postId);
        if (!post) return null;
        return {
          post_id: post.id,
          image_url: post.image_url,
          caption: post.caption,
          likes_count: likesCount[postId],
          user_id: post.user_id,
          username: (post.profiles as any)?.username || "Unknown",
          avatar_url: (post.profiles as any)?.avatar_url,
        };
      }).filter(Boolean) as RankingPost[];
    },
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });

  // 週間アクティブユーザー
  const { data: topUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["weekly-top-users"],
    queryFn: async () => {
      // 過去1週間の投稿を取得
      const { data: postsData, error: postsError } = await supabase
        .from("goods_posts")
        .select("user_id, id")
        .gte("created_at", oneWeekAgo.toISOString());

      if (postsError) throw postsError;

      // 過去1週間のいいねを取得
      const { data: likesData, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .gte("created_at", oneWeekAgo.toISOString());

      if (likesError) throw likesError;

      // ユーザーごとの投稿数といいね数を集計
      const userStats: Record<string, { posts: number; likes: number }> = {};
      
      postsData?.forEach((post) => {
        if (!userStats[post.user_id]) {
          userStats[post.user_id] = { posts: 0, likes: 0 };
        }
        userStats[post.user_id].posts++;
      });

      // 投稿IDからユーザーIDへのマップ
      const postToUser: Record<string, string> = {};
      postsData?.forEach((post) => {
        postToUser[post.id] = post.user_id;
      });

      likesData?.forEach((like) => {
        const userId = postToUser[like.post_id];
        if (userId && userStats[userId]) {
          userStats[userId].likes++;
        }
      });

      // スコアでソート（いいね数 + 投稿数 * 2）
      const topUserIds = Object.entries(userStats)
        .map(([userId, stats]) => ({
          userId,
          score: stats.likes + stats.posts * 2,
          ...stats,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (topUserIds.length === 0) return [];

      // プロフィールを取得
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", topUserIds.map((u) => u.userId));

      if (profilesError) throw profilesError;

      return topUserIds.map((user) => {
        const profile = profiles?.find((p) => p.id === user.userId);
        return {
          user_id: user.userId,
          username: profile?.username || "Unknown",
          avatar_url: profile?.avatar_url,
          likes_count: user.likes,
          posts_count: user.posts,
        };
      }) as RankingUser[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Trophy className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Trophy className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs text-muted-foreground w-4 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 週間人気投稿 */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          週間人気投稿
        </h3>
        <div className="space-y-2">
          {isLoadingPosts ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : topPosts && topPosts.length > 0 ? (
            topPosts.map((post, index) => (
              <Link
                key={post.post_id}
                to={`/posts?post=${post.post_id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0">{getRankBadge(index)}</div>
                <img
                  src={post.image_url}
                  alt=""
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    @{post.username}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {post.likes_count}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              まだデータがありません
            </p>
          )}
        </div>
      </div>

      {/* 週間アクティブユーザー */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-primary" />
          週間アクティブユーザー
        </h3>
        <div className="space-y-2">
          {isLoadingUsers ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))
          ) : topUsers && topUsers.length > 0 ? (
            topUsers.map((user, index) => (
              <Link
                key={user.user_id}
                to={`/user/${user.username}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0">{getRankBadge(index)}</div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.posts_count}投稿 · {user.likes_count}いいね
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              まだデータがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
