
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCard } from "./UserCard";
import { useAuth } from "@/contexts/AuthContext";

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
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

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
        setLoading(false);
        return;
      }

      const profiles = follows?.map((follow: any) =>
        type === "followers" ? follow.follower : follow.following
      ) || [];
      
      setProfiles(profiles);
      
      // 各ユーザーのコレクション数を取得
      if (profiles.length > 0) {
        fetchCollectionCounts(profiles.map(p => p.id));
        
        // 現在のユーザーがログインしている場合、フォロー状態を取得
        if (user) {
          fetchFollowState(profiles.map(p => p.id));
        }
      } else {
        setLoading(false);
      }
    };

    fetchFollows();
  }, [userId, type, user]);

  const fetchCollectionCounts = async (profileIds: string[]) => {
    try {
      // 一度のクエリで全ユーザーのコレクション数を取得
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .in("user_id", profileIds);
        
      if (error) throw error;
      
      // ユーザーごとのコレクション数を集計
      const counts: Record<string, number> = {};
      profileIds.forEach(id => counts[id] = 0); // 初期化
      
      data?.forEach(item => {
        counts[item.user_id] = (counts[item.user_id] || 0) + 1;
      });
      
      setCollectionCounts(counts);
    } catch (error) {
      console.error("Error fetching collection counts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowState = async (profileIds: string[]) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", profileIds);
        
      if (error) throw error;
      
      const newFollowState: Record<string, boolean> = {};
      profileIds.forEach(id => {
        newFollowState[id] = data?.some(f => f.following_id === id) || false;
      });
      
      setFollowState(newFollowState);
    } catch (error) {
      console.error("Error fetching follow state:", error);
    }
  };

  const handleFollow = async (profileId: string) => {
    if (!user) return;

    try {
      if (followState[profileId]) {
        // フォロー解除
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);
          
        setFollowState(prev => ({ ...prev, [profileId]: false }));
      } else {
        // フォロー
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: profileId });
          
        setFollowState(prev => ({ ...prev, [profileId]: true }));
      }
      
      // プロフィールデータを再取得
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, followers_count, following_count")
        .in("id", profiles.map(p => p.id));
        
      if (!error && data) {
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error updating follow:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-9 w-full mt-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[60vh] overflow-y-auto">
      <div className="space-y-4 pr-4 pb-4">
        {profiles.length === 0 ? (
          <p className="text-gray-500">
            {type === "followers" ? "フォロワーはいません" : "フォロー中のユーザーはいません"}
          </p>
        ) : (
          profiles.map((profile) => (
            <UserCard
              key={profile.id}
              id={profile.id}
              username={profile.username}
              bio={profile.bio}
              avatar_url={profile.avatar_url}
              followersCount={profile.followers_count || 0}
              followingCount={profile.following_count || 0}
              collectionCount={collectionCounts[profile.id] || 0}
              isFollowing={followState[profile.id]}
              onFollow={user && user.id !== profile.id ? () => handleFollow(profile.id) : undefined}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
