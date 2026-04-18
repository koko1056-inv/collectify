import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserPoints } from "@/hooks/usePoints";
import { useNavigate } from "react-router-dom";

interface PointsDisplayProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  clickable?: boolean;
}

export function PointsDisplay({ size = "md", showIcon = true, clickable = true }: PointsDisplayProps) {
  const { data: userPoints, isLoading, error } = useUserPoints();
  const navigate = useNavigate();

  if (isLoading) {
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
    console.error("[PointsDisplay] Error loading points:", error);
  }

  const totalPoints = userPoints?.total_points || 0;

  return (
    <Badge
      variant="secondary"
      onClick={clickable ? () => navigate("/point-shop") : undefined}
      className={`flex items-center gap-1 ${clickable ? "cursor-pointer hover:bg-secondary/80 transition-colors" : ""} ${
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
