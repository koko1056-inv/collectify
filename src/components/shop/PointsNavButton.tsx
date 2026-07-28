import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPoints } from "@/hooks/usePoints";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface PointsNavButtonProps {
  variant?: "icon" | "full";
}

export function PointsNavButton({ variant = "full" }: PointsNavButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userPoints, isLoading } = useUserPoints();
  const { t } = useLanguage();

  if (!user) return null;

  const points = userPoints?.total_points || 0;

  if (variant === "icon") {
    // 以前はカートのアイコンだけで残高が出ていなかったため、
    // 「+1pt獲得」の通知は届くのに合計が最後まで分からなかった。
    // 貯める動機が働くよう、狭いヘッダーでも数字を出す。
    // カートだと「お金で買う場所」に見えるので、無料で貯まるポイントらしい星にする。
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/point-shop")}
        aria-label={`${points} ${t("chrome.nav.pointsUnit")}`}
        className="relative h-8 gap-1 px-1.5"
      >
        <Star className="w-4 h-4 shrink-0 fill-yellow-400 text-yellow-400" />
        {isLoading ? (
          <Skeleton className="h-3.5 w-6" />
        ) : (
          <span className="text-xs font-semibold tabular-nums">
            {points.toLocaleString()}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/point-shop")}
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
