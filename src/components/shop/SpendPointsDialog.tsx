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
import { Star, Gift } from "lucide-react";
import { useUserPoints } from "@/hooks/usePoints";
import { useLanguage } from "@/contexts/LanguageContext";

interface SpendPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** 通常の消費ポイント。freeTrial=true の時は割引前の元価格として表示 */
  cost: number;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  /** 初回無料モード。trueなら 0pt として扱い、消費ポイント表示にバッジを出す */
  freeTrial?: boolean;
}

/**
 * ポイント消費の確認ダイアログ。残高表示と不足時のガード付き。
 * freeTrial=true の場合は「初回無料」表示で残高チェックをスキップする。
 */
export function SpendPointsDialog({
  open,
  onOpenChange,
  title,
  description,
  cost,
  confirmLabel,
  loading,
  onConfirm,
  freeTrial = false,
}: SpendPointsDialogProps) {
  const { t } = useLanguage();
  const { data: userPoints } = useUserPoints();
  const balance = userPoints?.total_points ?? 0;
  const effectiveCost = freeTrial ? 0 : cost;
  const insufficient = !freeTrial && balance < cost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>{description}</p>

              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">{t("misc.shop.cost")}</span>
                {freeTrial ? (
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-xs text-muted-foreground line-through">
                      {cost} pt
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                      <Gift className="h-3.5 w-3.5" />
                      {t("misc.common.freeFirstTime")}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {cost} pt
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("misc.shop.balance")}</span>
                <span className={insufficient ? "text-destructive font-medium" : "font-medium"}>
                  {balance.toLocaleString()} pt
                </span>
              </div>

              {freeTrial && (
                <p className="text-xs text-muted-foreground">
                  {t("misc.shop.freeTrialNote", { cost })}
                </p>
              )}
              {insufficient && (
                <p className="text-xs text-destructive">
                  {t("misc.shop.insufficient")}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("misc.common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={insufficient || loading}
          >
            {loading
              ? t("misc.common.processing")
              : freeTrial
                ? t("misc.shop.runFree")
                : (confirmLabel ?? t("misc.shop.spendDefaultConfirm"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
