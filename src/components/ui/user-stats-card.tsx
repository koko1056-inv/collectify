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
export function UserStatsCard({
  showHistoricalButton = false
}: UserStatsCardProps) {
  const {
    data: stats,
    isLoading
  } = useUserStats();
  const calculateHistorical = useCalculateHistoricalPoints();
  if (isLoading) {
    return <Card>
        <CardHeader>
          <CardTitle className="text-lg">活動統計</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({
            length: 4
          }).map((_, i) => <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
              </div>)}
          </div>
        </CardContent>
      </Card>;
  }
  if (!stats) return null;
  const memberSinceDate = new Date(stats.memberSince);
  const daysSinceMember = Math.floor((Date.now() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24));

  // ログイン日数×1 + グッズ追加数×5 で計算したポイント
  const calculatedPoints = stats.totalLoginDays * 1 + stats.totalItemsAdded * 5;
  return <Card className="overflow-hidden bg-gradient-to-br from-background via-accent/30 to-background border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-primary/5 to-secondary/5 pb-4 px-4 sm:px-6 space-y-2 sm:space-y-0">
        <CardTitle className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex-shrink-0">
          ✨ 活動統計
        </CardTitle>
        <div className="flex-shrink-0">
          <PointsDisplay size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group">
            <div className="p-2 rounded-full bg-blue-500 text-white group-hover:scale-110 transition-transform duration-200">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-blue-700">{stats.totalLoginDays}</span>
              <span className="text-xs font-medium text-blue-600">ログイン日数</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors duration-200 group">
            <div className="p-2 rounded-full bg-green-500 text-white group-hover:scale-110 transition-transform duration-200">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-green-700">{stats.currentStreak}</span>
              <span className="text-xs font-medium text-green-600">連続ログイン</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition-colors duration-200 group">
            <div className="p-2 rounded-full bg-yellow-500 text-white group-hover:scale-110 transition-transform duration-200">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-yellow-700">{stats.totalItemsAdded}</span>
              <span className="text-xs font-medium text-yellow-600">グッズ追加</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors duration-200 group">
            <div className="p-2 rounded-full bg-purple-500 text-white group-hover:scale-110 transition-transform duration-200">
              <Star className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-purple-700">{stats.totalContentAdded}</span>
              <span className="text-xs font-medium text-purple-600">コンテンツ追加</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400">
          <div className="p-2 rounded-full bg-gray-500 text-white">
            <Award className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-700">{daysSinceMember}日</span>
            <span className="text-sm font-medium text-gray-600">🎉 メンバー歴</span>
          </div>
        </div>
        
        {showHistoricalButton}
      </CardContent>
    </Card>;
}