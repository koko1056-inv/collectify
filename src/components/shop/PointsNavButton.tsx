import { useNavigate } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPoints } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";

interface PointsNavButtonProps {
  variant?: "icon" | "full";
}

export function PointsNavButton({ variant = "full" }: PointsNavButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userPoints, isLoading } = useUserPoints();

  if (!user) return null;

  const points = userPoints?.total_points || 0;

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/shop")}
        className="relative"
      >
        <ShoppingCart className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/shop")}
      className="gap-1.5 px-2"
    >
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      {isLoading ? (
        <Skeleton className="h-4 w-8" />
      ) : (
        <span className="font-medium">{points.toLocaleString()}</span>
      )}
      <span className="text-muted-foreground text-xs">pt</span>
    </Button>
  );
}
