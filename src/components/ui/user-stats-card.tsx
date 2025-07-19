import { Calendar, Trophy, Zap, Award, TrendingUp, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserStats, useCalculateHistoricalPoints } from "@/hooks/useUserStats";
import { PointsDisplay } from "./points-display";
import { AchievementsDisplay } from "./achievements-display";

interface UserStatsCardProps {
  showHistoricalButton?: boolean;
}

export function UserStatsCard({ showHistoricalButton = false }: UserStatsCardProps) {
  const { data: stats, isLoading } = useUserStats();
  const calculateHistorical = useCalculateHistoricalPoints();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">活動統計</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const memberSinceDate = new Date(stats.memberSince);
  const daysSinceMember = Math.floor(
    (Date.now() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // ログイン日数×1 + グッズ追加数×5 で計算したポイント
  const calculatedPoints = (stats.totalLoginDays * 1) + (stats.totalItemsAdded * 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">活動統計</CardTitle>
        <PointsDisplay size="sm" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ポイント計算内訳を表示 */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">ポイント計算</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>ログイン日数: {stats.totalLoginDays}日 × 1pt</span>
              <span>{stats.totalLoginDays}pt</span>
            </div>
            <div className="flex justify-between">
              <span>グッズ追加: {stats.totalItemsAdded}個 × 5pt</span>
              <span>{stats.totalItemsAdded * 5}pt</span>
            </div>
            <div className="flex justify-between font-medium text-primary border-t pt-1">
              <span>合計</span>
              <span>{calculatedPoints}pt</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{stats.totalLoginDays}日</span>
              <span className="text-xs text-muted-foreground">ログイン</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{stats.currentStreak}日</span>
              <span className="text-xs text-muted-foreground">連続ログイン</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{stats.totalItemsAdded}個</span>
              <span className="text-xs text-muted-foreground">グッズ追加</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{stats.totalContentAdded}個</span>
              <span className="text-xs text-muted-foreground">コンテンツ追加</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Award className="w-4 h-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{daysSinceMember}日</span>
            <span className="text-xs text-muted-foreground">メンバー歴</span>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">獲得称号</span>
          <AchievementsDisplay maxDisplay={3} />
        </div>
        
        {showHistoricalButton && (
          <div className="pt-2 border-t">
            <Button 
              onClick={() => calculateHistorical.mutate()}
              disabled={calculateHistorical.isPending}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Zap className="w-4 h-4 mr-2" />
              {calculateHistorical.isPending ? "計算中..." : "過去の活動ポイントを計算"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              これまでの活動履歴を元にポイントを遡って付与します
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}