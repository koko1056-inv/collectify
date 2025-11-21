import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { FollowList } from "./FollowList";

interface ProfileStatsProps {
  userId: string;
}

// 統計データを1つのクエリで取得
async function fetchProfileStats(userId: string) {
  const [profileData, collectionCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("followers_count, following_count")
      .eq("id", userId)
      .single(),
    supabase
      .from("user_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
  ]);

  if (profileData.error) throw profileData.error;
  
  return {
    followersCount: profileData.data.followers_count || 0,
    followingCount: profileData.data.following_count || 0,
    collectionCount: collectionCount.count || 0
  };
}

export const ProfileStats = memo(function ProfileStats({ userId }: ProfileStatsProps) {
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => fetchProfileStats(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    gcTime: 30 * 60 * 1000, // 30分間保持
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="font-bold text-xl">{stats?.collectionCount || 0}</div>
          <div className="text-sm text-muted-foreground">コレクション</div>
        </div>
        <button 
          onClick={() => setShowFollowers(true)}
          className="text-center hover:opacity-80 transition-opacity"
        >
          <div className="font-bold text-xl">{stats?.followersCount || 0}</div>
          <div className="text-sm text-muted-foreground">フォロワー</div>
        </button>
        <button 
          onClick={() => setShowFollowing(true)}
          className="text-center hover:opacity-80 transition-opacity"
        >
          <div className="font-bold text-xl">{stats?.followingCount || 0}</div>
          <div className="text-sm text-muted-foreground">フォロー中</div>
        </button>
      </div>

      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <FollowList userId={userId} type="followers" />
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <FollowList userId={userId} type="following" />
        </DialogContent>
      </Dialog>
    </>
  );
});
