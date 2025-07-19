
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PopularCollectors } from "@/components/profile/PopularCollectors";
import { Profile } from "@/types";
import { PointsDisplay } from "@/components/ui/points-display";
import { AchievementsDisplay } from "@/components/ui/achievements-display";
import { UserStatsCard } from "@/components/ui/user-stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

interface HomeContentProps {
  profile: Profile | undefined;
}

export function HomeContent({ profile }: HomeContentProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {user && (
        <UserStatsCard showHistoricalButton={true} />
      )}
      
      <FeaturedCollections />
      
      <div className="mt-8">
        <PopularCollectors />
      </div>
    </div>
  );
}
