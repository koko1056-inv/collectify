import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Heart, Users, TrendingUp, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Stats {
  totalItems: number;
  totalWishlists: number;
  totalFollowers: number;
  totalFollowing: number;
  recentAdditions: number;
}

export function CollectionStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["collection-stats", user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          totalItems: 0,
          totalWishlists: 0,
          totalFollowers: 0,
          totalFollowing: 0,
          recentAdditions: 0
        };
      }

      const [itemsResult, wishlistsResult, followersResult, followingResult, recentResult] = await Promise.all([
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("wishlists")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", user.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", user.id),
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        totalItems: itemsResult.count || 0,
        totalWishlists: wishlistsResult.count || 0,
        totalFollowers: followersResult.count || 0,
        totalFollowing: followingResult.count || 0,
        recentAdditions: recentResult.count || 0
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-1">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: Package,
      label: "コレクション",
      value: stats?.totalItems || 0,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      icon: Heart,
      label: "ウィッシュリスト",
      value: stats?.totalWishlists || 0,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      icon: Users,
      label: "フォロワー",
      value: stats?.totalFollowers || 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: TrendingUp,
      label: "今週の追加",
      value: stats?.recentAdditions || 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      highlight: (stats?.recentAdditions || 0) > 0
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold px-1 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        マイ統計
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item) => (
          <Card 
            key={item.label}
            className={cn(
              "border-border/50 transition-all hover:shadow-md",
              item.highlight && "ring-2 ring-primary/20"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                item.bgColor
              )}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
