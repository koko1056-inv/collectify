import { ArrowLeftRight, Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface CardActionsProps {
  onCreatePostClick: () => void;
  onToggleTrade: () => void;
  onDeleteClick: () => void;
  forTrade: boolean;
  isTradePending?: boolean;
}

/**
 * コレクションのカード下の操作。[投稿] [交換] | [削除]
 *
 * 以前はアイコンだけ（思い出・カメラ・ゴミ箱）で、何が起きるのか分かりにくかった。
 * カードは3列で幅が120px前後しかないので、アイコンの下に短い文字を添える縦並びにしている
 * （PCでも横並びにすると「交換中」が切れるので、幅によらず縦並び）。
 * 投稿のアイコンはグッズ詳細の「投稿する」と同じカメラにそろえる。
 * 交換は切り替えで、出しているあいだは写真左上の「交換」バッジと同じ primary の面で塗る。
 * 削除は文字なしの小さなボタンにし、区切り線で離しておく。隣を押すつもりで削除に当たる事故を避けるため。
 */
export function CardActions({
  onCreatePostClick,
  onToggleTrade,
  onDeleteClick,
  forTrade,
  isTradePending = false,
}: CardActionsProps) {
  const { t } = useLanguage();
  const stop =
    (fn: () => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };

  const slot =
    "tap-safe-y flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div data-card-actions className="flex w-full items-stretch gap-0.5">
      <button
        type="button"
        onClick={stop(onCreatePostClick)}
        className={cn(slot, "text-muted-foreground hover:bg-muted hover:text-foreground")}
        aria-label={t("collectionScreen.cardActions.postAria")}
        title={t("collectionScreen.cardActions.postAria")}
      >
        <Camera className="h-4 w-4 shrink-0" />
        <span className="max-w-full truncate text-3xs font-medium tracking-tight">
          {t("collectionScreen.cardActions.post")}
        </span>
      </button>

      <button
        type="button"
        onClick={stop(onToggleTrade)}
        disabled={isTradePending}
        aria-pressed={forTrade}
        className={cn(
          slot,
          "disabled:cursor-wait",
          forTrade
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
        )}
        aria-label={
          forTrade
            ? t("collectionScreen.cardActions.tradeOffAria")
            : t("collectionScreen.cardActions.tradeOnAria")
        }
        title={
          forTrade
            ? t("collectionScreen.cardActions.tradeOffAria")
            : t("collectionScreen.cardActions.tradeOnAria")
        }
      >
        <ArrowLeftRight className="h-4 w-4 shrink-0" />
        <span className="max-w-full truncate text-3xs font-medium tracking-tight">
          {forTrade ? t("collectionScreen.cardActions.trading") : t("collectionScreen.cardActions.trade")}
        </span>
      </button>

      <div aria-hidden className="mx-0.5 my-1.5 w-px shrink-0 bg-border/70" />

      <button
        type="button"
        onClick={stop(onDeleteClick)}
        className="tap-safe-y flex w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("collectionScreen.cardActions.delete")}
        title={t("collectionScreen.cardActions.delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
