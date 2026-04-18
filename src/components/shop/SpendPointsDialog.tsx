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
import { Star } from "lucide-react";
import { useUserPoints } from "@/hooks/usePoints";

interface SpendPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cost: number;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * ポイント消費の確認ダイアログ。残高表示と不足時のガード付き。
 */
export function SpendPointsDialog({
  open,
  onOpenChange,
  title,
  description,
  cost,
  confirmLabel = "消費して実行",
  loading,
  onConfirm,
}: SpendPointsDialogProps) {
  const { data: userPoints } = useUserPoints();
  const balance = userPoints?.total_points ?? 0;
  const insufficient = balance < cost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>{description}</p>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">消費ポイント</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {cost} pt
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">現在の残高</span>
                <span className={insufficient ? "text-destructive font-medium" : "font-medium"}>
                  {balance.toLocaleString()} pt
                </span>
              </div>
              {insufficient && (
                <p className="text-xs text-destructive">
                  ポイントが不足しています。ログインボーナスやグッズ登録で獲得できます。
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={insufficient || loading}
          >
            {loading ? "処理中…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
