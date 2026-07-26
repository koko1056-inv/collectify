import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorStateProps {
  /** 見出し。既定は汎用の読み込み失敗メッセージ。 */
  title?: string;
  /** 補足説明。 */
  description?: string;
  /** react-query の refetch を渡すと「再試行」ボタンを表示する。 */
  onRetry?: () => void;
  className?: string;
}

/**
 * データ取得に失敗したことを伝える共通の表示。
 *
 * これが無い画面では、通信エラーでも空状態（「まだありません」）が出てしまい、
 * ユーザーは「データが無い」と誤解して再試行の手段も得られない。
 * EmptyState と同じ縦組み・余白に揃えてあるので、同じ位置に差し替えられる。
 */
export function QueryErrorState({
  title = "読み込みに失敗しました",
  description = "通信状況を確認して、もう一度お試しください",
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-12",
        className
      )}
    >
      <div className="w-16 h-16 mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <p className="text-foreground font-medium mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5">
          <RotateCw className="w-3.5 h-3.5" />
          再試行
        </Button>
      )}
    </div>
  );
}
