import { useUserAchievements } from "@/hooks/usePoints";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Star, Zap } from "lucide-react";

interface AchievementsDisplayProps {
  userId?: string;
  showAll?: boolean;
  maxDisplay?: number;
}

export function AchievementsDisplay({ 
  showAll = false, 
  maxDisplay = 3 
}: AchievementsDisplayProps) {
  const { data: userAchievements, isLoading } = useUserAchievements();

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-muted animate-pulse rounded-full" />
        ))}
      </div>
    );
  }

  if (!userAchievements || userAchievements.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        称号なし
      </div>
    );
  }

  const displayAchievements = showAll 
    ? userAchievements 
    : userAchievements.slice(0, maxDisplay);

  const getAchievementIcon = (name: string) => {
    switch (name) {
      case "ビギナー":
        return <Star className="w-4 h-4" />;
      case "コレクター":
        return <Trophy className="w-4 h-4" />;
      case "エキスパート":
        return <Award className="w-4 h-4" />;
      case "レジェンド":
        return <Zap className="w-4 h-4" />;
      case "クリエイター":
        return <Star className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const getAchievementColor = (name: string) => {
    switch (name) {
      case "ビギナー":
        return "bg-green-100 text-green-800 border-green-200";
      case "コレクター":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "エキスパート":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "レジェンド":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "クリエイター":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {displayAchievements.map((userAchievement) => (
        <Badge
          key={userAchievement.id}
          variant="outline"
          className={`flex items-center gap-1 ${getAchievementColor(userAchievement.achievement?.name || "")}`}
        >
          {getAchievementIcon(userAchievement.achievement?.name || "")}
          <span className="text-xs font-medium">
            {userAchievement.achievement?.name}
          </span>
        </Badge>
      ))}
      
      {!showAll && userAchievements.length > maxDisplay && (
        <Badge variant="outline" className="text-muted-foreground">
          +{userAchievements.length - maxDisplay}
        </Badge>
      )}
    </div>
  );
}