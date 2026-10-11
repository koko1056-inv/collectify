import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PointIcon } from "@/components/ui/point-icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPoints } from "@/hooks/usePoints";
import { usePurchaseShopItem, type PointShopItem } from "@/hooks/usePointShop";

/**
 * 着せ替えを解放する前の確認。足りないときは「ポイントを手に入れる」でショップへ案内する。
 * 残高の検証・減算・解放の記録はサーバーの purchase_shop_item が1回の処理で行う。
 */
export function UnlockConfirmDialog({
  item,
  title,
  onOpenChange,
  onUnlocked,
}: {
  /** null のときは閉じている */
  item: PointShopItem | null;
  title: string;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: (unlockKey: string) => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: userPoints } = useUserPoints();
  const purchase = usePurchaseShopItem();
  const balance = userPoints?.total_points ?? 0;
  const cost = item?.points_cost ?? 0;
  const affordable = balance >= cost;

  const handleConfirm = async (e: React.MouseEvent) => {
    // 購入が終わるまで閉じない（AlertDialogAction は押すと閉じるため止める）
    e.preventDefault();
    if (!item) return;
    if (!affordable) {
      onOpenChange(false);
      navigate("/point-shop");
      return;
    }
    try {
      await purchase.mutateAsync({ ...item, name: title });
      onOpenChange(false);
      if (item.unlock_key) onUnlocked?.(item.unlock_key);
    } catch {
      // エラーの通知は usePurchaseShopItem が出す
    }
  };

  return (
    <AlertDialog open={!!item} onOpenChange={(o) => !purchase.isPending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cosmetics.confirmTitle", { name: title })}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="flex items-center justify-center gap-1.5 text-foreground sm:justify-start">
                <PointIcon size={18} />
                <span className="text-lg font-bold tabular-nums">{cost}</span>
                <span className="text-sm text-muted-foreground">pt</span>
              </p>
              {affordable ? (
                <p>{t("cosmetics.confirmDesc", { cost, balance: balance - cost })}</p>
              ) : (
                <p>
                  <span className="text-destructive font-medium">{t("cosmetics.insufficient")}</span>
                  <span className="ml-2 tabular-nums">{t("cosmetics.balance", { points: balance })}</span>
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={purchase.isPending}>{t("cosmetics.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={purchase.isPending}>
            {purchase.isPending
              ? t("cosmetics.processing")
              : affordable
                ? t("cosmetics.confirm")
                : t("cosmetics.getPoints")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
