import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import { Pocke } from "@/components/pocke/Pocke";

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
 * しょんぼりしたポッケが出る（責めない言い方で、もう一度ためしてもらう）。
 */
export function QueryErrorState({
  title = "うまく読み込めなかったみたい…",
  description = "電波のよいところで、もう一度ためしてみてね",
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
      <div className="relative mb-3">
        <Pocke pose="sad" height={96} motion="pop" loading="lazy" />
        <IconTile size="sm" tone="destructive" className="absolute -bottom-1 -right-3 bg-card shadow-sm ring-4 ring-background">
          <AlertTriangle />
        </IconTile>
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
