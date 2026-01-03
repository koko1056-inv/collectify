import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { useCollectionCount, useRoomCount } from "@/hooks/useCollectionLimit";
import { useUserLimits } from "@/hooks/usePointShop";

interface CollectionLimitBannerProps {
  type?: "collection" | "room";
}

export function CollectionLimitBanner({ type = "collection" }: CollectionLimitBannerProps) {
  const navigate = useNavigate();
  const { data: limits } = useUserLimits();
  const { data: collectionCount } = useCollectionCount();
  const { data: roomCount } = useRoomCount();

  const isCollection = type === "collection";
  const currentCount = isCollection ? (collectionCount || 0) : (roomCount || 0);
  const maxSlots = isCollection 
    ? (limits?.collection_slots || 100) 
    : (limits?.room_slots || 1);
  
  const usagePercent = Math.min(100, (currentCount / maxSlots) * 100);
  const remaining = Math.max(0, maxSlots - currentCount);
  const isNearLimit = usagePercent >= 80;
  const isAtLimit = currentCount >= maxSlots;

  // 上限に近くない場合は表示しない
  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  return (
    <div className={`rounded-lg p-4 mb-4 ${
      isAtLimit 
        ? "bg-destructive/10 border border-destructive/30" 
        : "bg-amber-500/10 border border-amber-500/30"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${isAtLimit ? "text-destructive" : "text-amber-500"}`}>
          {isAtLimit ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Package className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${isAtLimit ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
              {isAtLimit 
                ? `${isCollection ? "コレクション" : "ルーム"}枠が上限に達しました`
                : `${isCollection ? "コレクション" : "ルーム"}枠が残りわずかです`
              }
            </p>
            <span className="text-sm text-muted-foreground">
              {currentCount} / {maxSlots}
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : "[&>div]:bg-amber-500"}`} 
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isAtLimit 
                ? "ショップで枠を追加購入できます" 
                : `残り${remaining}${isCollection ? "個" : "部屋"}`
              }
            </p>
            <Button 
              size="sm" 
              variant={isAtLimit ? "default" : "outline"}
              className="gap-1 h-7"
              onClick={() => navigate("/shop")}
            >
              <ShoppingCart className="w-3 h-3" />
              ショップへ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
