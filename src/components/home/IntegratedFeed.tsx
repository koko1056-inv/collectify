import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeedPost {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
}

export function IntegratedFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: feedPosts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["integrated-feed", user?.id],
    queryFn: async () => {
      // フォローしているユーザーの投稿を取得
      let followingIds: string[] = [];
      
      if (user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        followingIds = follows?.map(f => f.following_id) || [];
      }

      // 投稿を取得（フォローしているユーザー + 人気の投稿）
      const { data: posts, error } = await supabase
        .from("goods_posts")
        .select(`
          id,
          image_url,
          caption,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // ユーザー情報を取得
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      // いいね数とコメント数を取得
      const postIds = posts?.map(p => p.id) || [];
      
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds),
        supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds)
      ]);

      const likesCount = postIds.reduce((acc, id) => {
        acc[id] = likesResult.data?.filter(l => l.post_id === id).length || 0;
        return acc;
      }, {} as Record<string, number>);

      const commentsCount = postIds.reduce((acc, id) => {
        acc[id] = commentsResult.data?.filter(c => c.post_id === id).length || 0;
        return acc;
      }, {} as Record<string, number>);

      return posts?.map(post => {
        const profile = profiles?.find(p => p.id === post.user_id);
        return {
          id: post.id,
          image_url: post.image_url,
          caption: post.caption,
          created_at: post.created_at,
          user: {
            id: post.user_id,
            username: profile?.username || "ユーザー",
            avatar_url: profile?.avatar_url || null
          },
          likes_count: likesCount[post.id] || 0,
          comments_count: commentsCount[post.id] || 0
        };
      }) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold px-1">最新の投稿</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-48">
              <Skeleton className="aspect-square rounded-xl" />
              <div className="mt-2 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold">最新の投稿</h3>
        <button 
          onClick={() => navigate("/posts")}
          className="text-sm text-primary hover:underline"
        >
          すべて見る
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {feedPosts.map((post) => (
          <div
            key={post.id}
            className="flex-shrink-0 w-48 cursor-pointer group"
            onClick={() => navigate("/posts")}
          >
            {/* 投稿画像 */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={post.image_url}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* オーバーレイ（ホバー時） */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm font-medium">{post.likes_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{post.comments_count}</span>
                </div>
              </div>
            </div>
            
            {/* ユーザー情報 */}
            <div className="mt-2 flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={post.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  <User className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ja })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
