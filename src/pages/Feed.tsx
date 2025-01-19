import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { FeedPost } from "@/components/feed/FeedPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PostSkeleton } from "@/components/feed/PostSkeleton";

export default function Feed() {
  const { user } = useAuth();

  const { data: followingPosts, isLoading: isLoadingFollowing } = useQuery({
    queryKey: ["following-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: followingIds } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!followingIds?.length) return [];

      const { data: posts } = await supabase
        .from("user_items")
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          user_item_likes (
            user_id
          )
        `)
        .in("user_id", followingIds.map(f => f.following_id))
        .order("created_at", { ascending: false });

      return posts || [];
    },
    enabled: !!user
  });

  const { data: recommendedPosts, isLoading: isLoadingRecommended } = useQuery({
    queryKey: ["recommended-posts"],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("user_items")
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          user_item_likes (
            user_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      return posts || [];
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-4 pt-20 sm:py-8 sm:pt-24">
        <FeedHeader />
        
        <Tabs defaultValue="recommended" className="w-full mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="following" className="w-full">
              フォロー中
            </TabsTrigger>
            <TabsTrigger value="recommended" className="w-full">
              おすすめ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="mt-6 space-y-6">
            {isLoadingFollowing ? (
              Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))
            ) : followingPosts?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                フォローしているユーザーの投稿がありません
              </div>
            ) : (
              followingPosts?.map((post) => (
                <FeedPost key={post.id} post={post} />
              ))
            )}
          </TabsContent>

          <TabsContent value="recommended" className="mt-6 space-y-6">
            {isLoadingRecommended ? (
              Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))
            ) : recommendedPosts?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                投稿がありません
              </div>
            ) : (
              recommendedPosts?.map((post) => (
                <FeedPost key={post.id} post={post} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}