import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserStats } from "@/hooks/useUserStats";

interface PointsDisplayProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function PointsDisplay({ size = "md", showIcon = true }: PointsDisplayProps) {
  const { data: userStats, isLoading, error } = useUserStats();

  console.log("[PointsDisplay] Component state:", { userStats, isLoading, error });

  if (isLoading) {
    console.log("[PointsDisplay] Showing loading state");
    return (
      <div className={`flex items-center gap-1 ${
        size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"
      }`}>
        <div className="w-4 h-4 bg-muted animate-pulse rounded" />
        <span>-</span>
      </div>
    );
  }

  if (error) {
    console.error("[PointsDisplay] Error loading stats:", error);
  }

  // ログイン日数×1 + グッズ追加数×5 で計算
  const loginPoints = (userStats?.totalLoginDays || 0) * 1;
  const itemPoints = (userStats?.totalItemsAdded || 0) * 5;
  const totalPoints = loginPoints + itemPoints;
  
  console.log("[PointsDisplay] Points calculation:", {
    loginDays: userStats?.totalLoginDays,
    itemsAdded: userStats?.totalItemsAdded,
    loginPoints,
    itemPoints,
    totalPoints
  });

  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center gap-1 ${
        size === "sm" ? "text-xs px-2 py-1" : 
        size === "lg" ? "text-base px-3 py-2" : "text-sm px-2.5 py-1.5"
      }`}
    >
      {showIcon && <Star className={`
        ${size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"}
        fill-yellow-400 text-yellow-400
      `} />}
      <span className="font-medium">{totalPoints.toLocaleString()}</span>
      <span className="text-muted-foreground">pt</span>
    </Badge>
  );
}