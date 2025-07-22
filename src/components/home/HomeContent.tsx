
import { useEffect } from "react";
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PopularCollectors } from "@/components/profile/PopularCollectors";
import { Profile } from "@/types";
import { PointsDisplay } from "@/components/ui/points-display";
import { AchievementsDisplay } from "@/components/ui/achievements-display";
import { UserStatsCard } from "@/components/ui/user-stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { debugUserPoints } from "@/utils/debug-points";

interface HomeContentProps {
  profile: Profile | undefined;
}

export function HomeContent({ profile }: HomeContentProps) {
  const { user } = useAuth();

  // デバッグ用：ユーザーがログインしている場合にポイント情報を出力
  useEffect(() => {
    if (user?.id) {
      console.log("[HomeContent] User logged in, debugging points for:", user.id);
      debugUserPoints(user.id);
    }
  }, [user?.id]);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {user && (
        <UserStatsCard showHistoricalButton={true} />
      )}
      
      <FeaturedCollections />
      
      <div className="mt-6 sm:mt-8">
        <PopularCollectors />
      </div>
    </div>
  );
}
