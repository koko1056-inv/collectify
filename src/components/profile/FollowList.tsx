
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
}

export function FollowList({ userId, type }: FollowListProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchFollows = async () => {
      const { data: follows, error } = await supabase
        .from("follows")
        .select(
          type === "followers"
            ? "follower:profiles!follows_follower_id_fkey(id, username, avatar_url, bio, followers_count, following_count)"
            : "following:profiles!follows_following_id_fkey(id, username, avatar_url, bio, followers_count, following_count)"
        )
        .eq(type === "followers" ? "following_id" : "follower_id", userId);

      if (error) {
        console.error("Error fetching follows:", error);
        return;
      }

      const profiles = follows?.map((follow: any) =>
        type === "followers" ? follow.follower : follow.following
      ) || [];
      
      setProfiles(profiles);
      
      // 各ユーザーのコレクション数を取得
      if (profiles.length > 0) {
        fetchCollectionCounts(profiles.map(p => p.id));
      } else {
        setLoading(false);
      }
    };

    fetchFollows();
  }, [userId, type]);

  const fetchCollectionCounts = async (profileIds: string[]) => {
    try {
      const counts: Record<string, number> = {};
      
      // 各ユーザーのコレクション数を取得
      const promises = profileIds.map(async (profileId) => {
        const { count, error } = await supabase
          .from("user_items")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", profileId);
          
        if (error) throw error;
        counts[profileId] = count || 0;
      });
      
      await Promise.all(promises);
      setCollectionCounts(counts);
    } catch (error) {
      console.error("Error fetching collection counts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-13rem)]">
      <div className="space-y-4 pr-4">
        {profiles.length === 0 ? (
          <p className="text-gray-500">
            {type === "followers" ? "フォロワーはいません" : "フォロー中のユーザーはいません"}
          </p>
        ) : (
          profiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/user/${profile.id}`}
              className="flex flex-col gap-2 p-3 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <img
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.username}
                    className="object-cover"
                  />
                </Avatar>
                <div className="flex-1">
                  <span className="font-medium">{profile.username}</span>
                  {profile.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 text-xs text-gray-500 mt-1">
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{profile.following_count}</span>
                  <span>フォロー中</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{profile.followers_count}</span>
                  <span>フォロワー</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{collectionCounts[profile.id] || 0}</span>
                  <span>コレクション</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
