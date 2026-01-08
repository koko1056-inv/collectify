import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FollowList } from "./FollowList";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Heart, Users, TrendingUp, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileStatsProps {
  userId: string;
}

// 統計データを1つのクエリで取得
async function fetchProfileStats(userId: string) {
  const [profileData, collectionCount, wishlistCount, recentCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("followers_count, following_count")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("wishlists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  // エラーがあってもデフォルト値を返す
  return {
    followersCount: profileData.data?.followers_count ?? 0,
    followingCount: profileData.data?.following_count ?? 0,
    collectionCount: collectionCount.count ?? 0,
    wishlistCount: wishlistCount.count ?? 0,
    recentAdditions: recentCount.count ?? 0
  };
}

export const ProfileStats = memo(function ProfileStats({ userId }: ProfileStatsProps) {
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => fetchProfileStats(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-10 w-10 mx-auto mb-1 rounded-xl" />
              <Skeleton className="h-5 w-8 mx-auto mb-0.5" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    {
      icon: Package,
      label: "コレクション",
      value: stats?.collectionCount || 0,
      onClick: undefined
    },
    {
      icon: Heart,
      label: "ウィッシュ",
      value: stats?.wishlistCount || 0,
      onClick: undefined
    },
    {
      icon: Users,
      label: "フォロワー",
      value: stats?.followersCount || 0,
      onClick: () => setShowFollowers(true)
    },
    {
      icon: UserPlus,
      label: "フォロー中",
      value: stats?.followingCount || 0,
      onClick: () => setShowFollowing(true)
    },
    {
      icon: TrendingUp,
      label: "今週追加",
      value: stats?.recentAdditions || 0,
      highlight: (stats?.recentAdditions || 0) > 0,
      onClick: undefined
    }
  ];

  return (
    <>
      <div className="mb-6">
        <div className="grid grid-cols-5 gap-1">
          {statItems.map((item) => {
            const Component = item.onClick ? "button" : "div";
            return (
              <Component
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center p-2 rounded-xl transition-all",
                  item.onClick && "hover:bg-muted/50 cursor-pointer"
                )}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 bg-primary/10">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold">{item.value}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
              </Component>
            );
          })}
        </div>
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
