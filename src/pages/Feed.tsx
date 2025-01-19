import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedPost } from "@/components/feed/FeedPost";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { useAuth } from "@/contexts/AuthContext";

const Feed = () => {
  const [currentTab, setCurrentTab] = useState<"following" | "recommended" | "all">("all");
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed-posts", currentTab],
    queryFn: async () => {
      let query = supabase
        .from("user_items")
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            display_name
          ),
          user_item_likes (
            id,
            user_id
          ),
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (currentTab === "following" && user) {
        const { data: followingIds } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (followingIds?.length) {
          query = query.in(
            "user_id",
            followingIds.map((f) => f.following_id)
          );
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: currentTab === "all" || (currentTab === "following" && !!user),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <FeedHeader />
      
      <main className="container mx-auto px-4 py-4">
        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value as typeof currentTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="following">フォロー中</TabsTrigger>
            <TabsTrigger value="recommended">おすすめ</TabsTrigger>
            <TabsTrigger value="all">すべて</TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="space-y-4 mt-4">
            {isLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => <PostSkeleton key={i} />)
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                投稿がありません
              </div>
            ) : (
              posts.map((post) => <FeedPost key={post.id} post={post} />)
            )}
          </TabsContent>

          <TabsContent value="recommended" className="space-y-4 mt-4">
            <div className="text-center py-8 text-gray-500">
              準備中です
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-4">
            {isLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => <PostSkeleton key={i} />)
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                投稿がありません
              </div>
            ) : (
              posts.map((post) => <FeedPost key={post.id} post={post} />)
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Feed;