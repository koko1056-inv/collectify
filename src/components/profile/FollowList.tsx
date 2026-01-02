import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCard } from "./UserCard";
import { useAuth } from "@/contexts/AuthContext";
import { Users, UserPlus } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      
      if (profiles.length > 0) {
        fetchCollectionCounts(profiles.map(p => p.id));
        
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
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .in("user_id", profileIds);
        
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      profileIds.forEach(id => counts[id] = 0);
      
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
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId);
          
        setFollowState(prev => ({ ...prev, [profileId]: false }));
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: profileId });
          
        setFollowState(prev => ({ ...prev, [profileId]: true }));
      }
      
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

  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="pb-4 border-b border-border">
        <DialogTitle className="flex items-center gap-2 text-lg">
          {type === "followers" ? (
            <>
              <Users className="w-5 h-5 text-primary" />
              フォロワー
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 text-primary" />
              フォロー中
            </>
          )}
          <span className="text-muted-foreground font-normal text-sm ml-1">
            ({profiles.length})
          </span>
        </DialogTitle>
      </DialogHeader>

      {loading ? (
        <div className="space-y-3 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            {type === "followers" ? (
              <Users className="w-8 h-8 text-muted-foreground" />
            ) : (
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground font-medium">
            {type === "followers" ? "フォロワーはいません" : "フォロー中のユーザーはいません"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {type === "followers" 
              ? "あなたをフォローしているユーザーがここに表示されます" 
              : "フォローしたユーザーがここに表示されます"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-4">
            {profiles.map((profile) => (
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
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
