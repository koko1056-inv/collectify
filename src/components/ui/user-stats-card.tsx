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
  return <Card className="overflow-hidden bg-gradient-to-br from-background via-accent/50 to-background border border-border hover:shadow-xl transition-all duration-500 hover:scale-[1.01] mx-2 sm:mx-0 mt-6 sm:mt-0 animate-fade-in">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-primary/5 to-secondary/5 pb-3 sm:pb-4 px-3 sm:px-6 pt-6 space-y-2 sm:space-y-0">
        <CardTitle className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex-shrink-0">
          ✨ 活動統計
        </CardTitle>
        <div className="flex-shrink-0">
          <PointsDisplay size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* ログイン日数 */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-stats-login-bg hover:bg-stats-login-hover transition-all duration-300 group cursor-pointer border border-transparent hover:border-stats-login/20">
            <div className="p-2 rounded-full bg-stats-login text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-bold text-stats-login animate-scale-in">
                {stats.totalLoginDays}
              </span>
              <span className="text-xs font-medium text-stats-login/80">
                ログイン日数
              </span>
            </div>
          </div>
          
          {/* 連続ログイン */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-stats-streak-bg hover:bg-stats-streak-hover transition-all duration-300 group cursor-pointer border border-transparent hover:border-stats-streak/20">
            <div className="p-2 rounded-full bg-stats-streak text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-bold text-stats-streak animate-scale-in">
                {stats.currentStreak}
              </span>
              <span className="text-xs font-medium text-stats-streak/80">
                連続ログイン
              </span>
            </div>
          </div>
          
          {/* グッズ追加 */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-stats-items-bg hover:bg-stats-items-hover transition-all duration-300 group cursor-pointer border border-transparent hover:border-stats-items/20">
            <div className="p-2 rounded-full bg-stats-items text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-bold text-stats-items animate-scale-in">
                {stats.totalItemsAdded}
              </span>
              <span className="text-xs font-medium text-stats-items/80">
                グッズ追加
              </span>
            </div>
          </div>
          
          {/* コンテンツ追加 */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-stats-content-bg hover:bg-stats-content-hover transition-all duration-300 group cursor-pointer border border-transparent hover:border-stats-content/20">
            <div className="p-2 rounded-full bg-stats-content text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-bold text-stats-content animate-scale-in">
                {stats.totalContentAdded}
              </span>
              <span className="text-xs font-medium text-stats-content/80">
                コンテンツ追加
              </span>
            </div>
          </div>
        </div>
        
        {/* メンバー歴 */}
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-stats-member-bg hover:bg-stats-member-hover transition-all duration-300 group cursor-pointer border border-transparent hover:border-stats-member/20">
          <div className="p-2 rounded-full bg-stats-member text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>          
          <div className="flex flex-col">
            <span className="text-lg sm:text-2xl font-bold text-stats-member animate-scale-in">
              {daysSinceMember}日
            </span>
            <span className="text-sm font-medium text-stats-member/80">
              🎉 メンバー歴
            </span>
          </div>
        </div>
        
        {showHistoricalButton}
      </CardContent>
    </Card>;
}