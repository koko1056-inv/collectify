import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, Plus, AlertTriangle } from "lucide-react";
import { useCollectionCount, useRoomCount } from "@/hooks/useCollectionLimit";
import { useUserLimits } from "@/hooks/usePointShop";
import { useExpandCollectionSlots } from "@/hooks/useSpendPoints";
import { SpendPointsDialog } from "./SpendPointsDialog";

interface CollectionLimitBannerProps {
  type?: "collection" | "room";
}

const EXPAND_COST = 30;
const EXPAND_AMOUNT = 10;

/**
 * 枠残量の警告 + ポイント消費による拡張ボタン。
 * ルーム枠は現状ポイント拡張対象外（コレクション枠のみ即時拡張可）。
 */
export function CollectionLimitBanner({ type = "collection" }: CollectionLimitBannerProps) {
  const { data: limits } = useUserLimits();
  const { data: collectionCount } = useCollectionCount();
  const { data: roomCount } = useRoomCount();
  const expand = useExpandCollectionSlots();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCollection = type === "collection";
  const currentCount = isCollection ? collectionCount || 0 : roomCount || 0;
  const maxSlots = isCollection
    ? limits?.collection_slots || 100
    : limits?.room_slots || 1;

  const usagePercent = Math.min(100, (currentCount / maxSlots) * 100);
  const remaining = Math.max(0, maxSlots - currentCount);
  const isAtLimit = currentCount >= maxSlots;
  const isAlmostFull = usagePercent >= 95 && !isAtLimit;

  if (!isAtLimit && !isAlmostFull) return null;

  const handleExpand = () => {
    expand.mutate(undefined, {
      onSettled: () => setConfirmOpen(false),
    });
  };

  // 95-99%: 控えめな pill
  if (isAlmostFull) {
    return (
      <>
        <div className="flex items-center justify-between w-full gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-800 dark:text-amber-300 truncate">
              残り{remaining}{isCollection ? "個" : "部屋"}で上限
            </span>
          </div>
          {isCollection && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" />
              +{EXPAND_AMOUNT}枠 ({EXPAND_COST}pt)
            </button>
          )}
        </div>
        {isCollection && (
          <SpendPointsDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="コレクション枠を拡張"
            description={`コレクション枠を +${EXPAND_AMOUNT} 拡張します。現在の上限 ${maxSlots} → ${maxSlots + EXPAND_AMOUNT}`}
            cost={EXPAND_COST}
            confirmLabel={`${EXPAND_COST}pt 消費して拡張`}
            loading={expand.isPending}
            onConfirm={handleExpand}
          />
        )}
      </>
    );
  }

  // 100%+: 本格バナー
  return (
    <>
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
                {isCollection
                  ? `${EXPAND_COST}ptで枠を +${EXPAND_AMOUNT} 拡張できます`
                  : "ルーム枠の拡張は現在準備中です"}
              </p>
              {isCollection && (
                <Button
                  size="sm"
                  className="gap-1 h-7"
                  onClick={() => setConfirmOpen(true)}
                  disabled={expand.isPending}
                >
                  <Plus className="w-3 h-3" />
                  +{EXPAND_AMOUNT}枠
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {isCollection && (
        <SpendPointsDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="コレクション枠を拡張"
          description={`コレクション枠を +${EXPAND_AMOUNT} 拡張します。現在の上限 ${maxSlots} → ${maxSlots + EXPAND_AMOUNT}`}
          cost={EXPAND_COST}
          confirmLabel={`${EXPAND_COST}pt 消費して拡張`}
          loading={expand.isPending}
          onConfirm={handleExpand}
        />
      )}
    </>
  );
}
