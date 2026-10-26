import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pocke, PockeBubble } from "@/components/pocke/Pocke";
import { useLanguage } from "@/contexts/LanguageContext";
import { registerInlineLoadError } from "@/components/pocke/pockeLoad";

interface QueryErrorStateProps {
  /** 見出し。既定はポッケの「うまく読み込めなかったみたい…」。 */
  title?: string;
  /** 補足説明。 */
  description?: string;
  /** react-query の refetch。渡さないときは、失敗している表示中のクエリをまとめて読み込み直す。 */
  onRetry?: () => void;
  className?: string;
}

/**
 * データ取得に失敗したことを伝える共通の表示。
 *
 * これが無い画面では、通信エラーでも空状態（「まだありません」）が出てしまい、
 * ユーザーは「データが無い」と誤解して再試行の手段も得られない。
 * EmptyState と同じ縦組み・余白に揃えてあるので、同じ位置に差し替えられる。
 * しょんぼりしたポッケが吹き出しで話す（責めない言い方で、「もう一度読み込む」を押してもらう）。
 */
export function QueryErrorState({ title, description, onRetry, className }: QueryErrorStateProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const retry =
    onRetry ??
    (() => void queryClient.refetchQueries({ type: "active", predicate: (q) => q.state.status === "error" }));
  // 出ているあいだは、左下のポッケ（PockeLoadHost）が同じことを重ねて言わないようにする
  useEffect(() => registerInlineLoadError(), []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center text-center px-4 py-12", className)}
    >
      <PockeBubble tail="bottom" className="mb-3 max-w-xs">
        <p className="font-bold">{title ?? t("pocke.load.failed")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description ?? t("pocke.load.failedHint")}</p>
      </PockeBubble>
      <Pocke pose="sad" height={88} motion="pop" loading="lazy" />
      <Button variant="outline" size="sm" onClick={retry} className="mt-4 gap-1.5">
        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
        {t("pocke.load.retry")}
      </Button>
    </div>
  );
}
