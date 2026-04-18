import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { useCollectionCount, useRoomCount } from "@/hooks/useCollectionLimit";
import { useUserLimits } from "@/hooks/usePointShop";

interface CollectionLimitBannerProps {
  type?: "collection" | "room";
}

/**
 * 枠残量の警告表示。脅し感を抑え、段階的に強度を上げる設計:
 *   0-94%: 非表示
 *   95-99%: 小さな pill を右寄せ表示
 *   100%+ : 本格バナー（赤）
 */
export function CollectionLimitBanner({ type = "collection" }: CollectionLimitBannerProps) {
  const navigate = useNavigate();
  const { data: limits } = useUserLimits();
  const { data: collectionCount } = useCollectionCount();
  const { data: roomCount } = useRoomCount();

  const isCollection = type === "collection";
  const currentCount = isCollection ? collectionCount || 0 : roomCount || 0;
  const maxSlots = isCollection
    ? limits?.collection_slots || 100
    : limits?.room_slots || 1;

  const usagePercent = Math.min(100, (currentCount / maxSlots) * 100);
  const remaining = Math.max(0, maxSlots - currentCount);
  const isAtLimit = currentCount >= maxSlots;
  const isAlmostFull = usagePercent >= 95 && !isAtLimit;

  // 95%未満は非表示
  if (!isAtLimit && !isAlmostFull) {
    return null;
  }

  // 95-99%: 控えめな pill（スクロール場所を食わない）
  if (isAlmostFull) {
    return (
      <button
        onClick={() => navigate("/point-shop")}
        className="flex items-center justify-between w-full gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300 truncate">
            残り{remaining}{isCollection ? "個" : "部屋"}で上限
          </span>
        </div>
        <span className="text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap flex items-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          枠を追加
        </span>
      </button>
    );
  }

  // 100%+: 本格的な警告バナー
  return (
    <div className="rounded-xl p-4 bg-destructive/10 border border-destructive/30">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-destructive">
              {isCollection ? "コレクション" : "ルーム"}枠が上限に達しました
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentCount} / {maxSlots}
            </span>
          </div>
          <Progress value={100} className="h-1.5 [&>div]:bg-destructive" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              ショップで枠を追加購入できます
            </p>
            <Button
              size="sm"
              className="gap-1 h-7"
              onClick={() => navigate("/point-shop")}
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
