import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, Home, AlertTriangle } from "lucide-react";
import { useCollectionCount, useRoomCount } from "@/hooks/useCollectionLimit";
import { useUserLimits } from "@/hooks/usePointShop";
import { useExpandCollectionSlots } from "@/hooks/useSpendPoints";
import { SpendPointsDialog } from "./SpendPointsDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SlotUsageMeterProps {
  type?: "collection" | "room";
  /** 見出しと拡張ボタンを省いた1行表示にする（既存の密なレイアウトに置く用） */
  compact?: boolean;
  className?: string;
}

const EXPAND_COST = 30;
const EXPAND_AMOUNT = 10;

/**
 * 枠の使用状況を常に表示する。
 *
 * 以前は 95% を超えるまで何も出さなかったため、普段は自分がどれだけ枠を
 * 使っているのか分からなかった。ここでは常に「使用数 / 上限」を出し、
 * 残りが少なくなったときだけ配色と補足文で警告を強める。
 */
export function SlotUsageMeter({
  type = "collection",
  compact = false,
  className,
}: SlotUsageMeterProps) {
  const { t } = useLanguage();
  const { data: limits } = useUserLimits();
  const { data: collectionCount } = useCollectionCount();
  const { data: roomCount } = useRoomCount();
  const expand = useExpandCollectionSlots();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCollection = type === "collection";
  const count = isCollection ? collectionCount : roomCount;

  // 数が確定するまでは何も出さない（0 / 100 と一瞬見えてしまうのを避ける）
  if (limits === undefined || count === undefined) return null;

  const currentCount = count ?? 0;
  const maxSlots = isCollection
    ? limits?.collection_slots || 100
    : limits?.room_slots || 1;

  const usagePercent = Math.min(100, (currentCount / maxSlots) * 100);
  const remaining = Math.max(0, maxSlots - currentCount);
  const isAtLimit = currentCount >= maxSlots;
  const isAlmostFull = !isAtLimit && usagePercent >= 80;

  const Icon = isCollection ? Package : Home;

  const handleExpand = () => {
    expand.mutate(undefined, { onSettled: () => setConfirmOpen(false) });
  };

  const barTone = isAtLimit
    ? "[&>div]:bg-destructive"
    : isAlmostFull
      ? "[&>div]:bg-amber-500"
      : undefined;

  const countTone = isAtLimit
    ? "text-destructive"
    : isAlmostFull
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  const expandDialog = isCollection ? (
    <SpendPointsDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={t("misc.shop.expandTitle")}
      description={t("misc.shop.expandDesc", {
        amount: EXPAND_AMOUNT,
        from: maxSlots,
        to: maxSlots + EXPAND_AMOUNT,
      })}
      cost={EXPAND_COST}
      confirmLabel={t("misc.shop.expandConfirm", { cost: EXPAND_COST })}
      loading={expand.isPending}
      onConfirm={handleExpand}
    />
  ) : null;

  if (compact) {
    return (
      <>
        <div className={cn("space-y-1.5", className)}>
          <div className="flex items-center gap-2 text-xs">
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {isCollection
                ? t("misc.shop.slotsCollection")
                : t("misc.shop.slotsRoom")}
            </span>
            <span className={cn("ml-auto font-medium tabular-nums", countTone)}>
              {currentCount} / {maxSlots}
            </span>
          </div>
          <Progress value={usagePercent} className={cn("h-1.5", barTone)} />
        </div>
        {expandDialog}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border p-3.5",
          isAtLimit
            ? "bg-destructive/10 border-destructive/30"
            : "bg-card border-border",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {isAtLimit ? (
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          ) : (
            <Icon className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="text-sm font-medium">
            {isCollection ? t("misc.shop.slotsCollection") : t("misc.shop.slotsRoom")}
          </span>
          <span className={cn("ml-auto text-sm font-semibold tabular-nums", countTone)}>
            {currentCount}
            <span className="text-muted-foreground font-normal"> / {maxSlots}</span>
          </span>
        </div>

        <Progress value={usagePercent} className={cn("h-2", barTone)} />

        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-xs text-muted-foreground">
            {isAtLimit
              ? isCollection
                ? t("misc.shop.limitReachedCollection")
                : t("misc.shop.limitReachedRoom")
              : isAlmostFull
                ? // 残りが少ないときだけ警告調にする
                  isCollection
                  ? t("misc.shop.remainingItems", { n: remaining })
                  : t("misc.shop.remainingRooms", { n: remaining })
                : isCollection
                  ? t("misc.shop.canAddItems", { n: remaining })
                  : t("misc.shop.canAddRooms", { n: remaining })}
          </p>
          {isCollection ? (
            <Button
              size="sm"
              variant={isAtLimit || isAlmostFull ? "default" : "ghost"}
              className="h-7 shrink-0 text-xs"
              onClick={() => setConfirmOpen(true)}
              disabled={expand.isPending}
            >
              {/* ラベル側に既に「+」が入っているのでアイコンは付けない */}
              {t("misc.shop.expandSlots", { n: EXPAND_AMOUNT, cost: EXPAND_COST })}
            </Button>
          ) : (
            isAtLimit && (
              <p className="text-xs text-muted-foreground shrink-0">
                {t("misc.shop.roomExpandComingSoon")}
              </p>
            )
          )}
        </div>
      </div>
      {expandDialog}
    </>
  );
}
