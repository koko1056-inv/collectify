
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { PopularCollectors } from "@/components/profile/PopularCollectors";
import { Profile } from "@/types";
import { PointsDisplay } from "@/components/ui/points-display";
import { AchievementsDisplay } from "@/components/ui/achievements-display";
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">あなたの活動</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ポイント</span>
              <PointsDisplay size="md" />
            </div>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">獲得称号</span>
              <AchievementsDisplay maxDisplay={4} />
            </div>
          </CardContent>
        </Card>
      )}
      
      <FeaturedCollections />
      
      <div className="mt-8">
        <PopularCollectors />
      </div>
    </div>
  );
}
