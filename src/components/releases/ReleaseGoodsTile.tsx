import { Heart, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";
import type { ReleaseItem } from "@/hooks/useOshiReleases";
import type { ReleaseActions } from "@/hooks/useReleaseActions";
import { isPreorderTitle, shortGoodsTitle } from "@/utils/goodsTitle";

/** 推しの新商品のグッズ1つ（写真・名前・1行の補足・ほしいもののハート）。タップで詳細 */

export function ReleaseGoodsTile({
  item,
  actions,
  isNew,
  meta,
  className,
}: {
  item: ReleaseItem;
  actions: ReleaseActions;
  /** まだ見ていない新着（「NEW」の印） */
  isNew?: boolean;
  /** 名前の下の1行（作品名・発売日など） */
  meta?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const wished = actions.isWished(item.id);
  const busy = actions.busyId === item.id;
  // カタログの名前は【予約】【発送時期】などの注記で長い。一覧では外して「予約」の札にする（詳細では元の名前）
  const preorder = isPreorderTitle(item.title);
  // 自分が予約しているものは、カタログの「予約」の札より優先して「予約中」と出す
  const preordered = actions.isPreordered(item.id);
  return (
    <div className={cn("relative min-w-0", className)} data-testid="release-tile">
      <button
        type="button"
        onClick={() => actions.open(item)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        aria-label={t("discover.tile.openAria", { title: item.title })}
      >
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30">
          {/* カタログの外部画像は原寸が大きいので、サーバーで縮めたサムネを読む */}
          <img
            src={getOptimizedImageUrl(item.image, { width: 320 })}
            onError={fallbackToOriginal(item.image)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
          {preordered ? (
            <span
              className="absolute bottom-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-3xs font-bold leading-none text-primary-foreground shadow-sm"
              data-testid="release-tile-preordered"
            >
              {t("preorders.tile.preordered")}
            </span>
          ) : preorder ? (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-3xs font-bold leading-none text-foreground shadow-sm">
              {t("discover.tile.preorder")}
            </span>
          ) : null}
          {isNew && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-3xs font-bold leading-none text-primary-foreground shadow-sm">
              NEW
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-2xs font-medium leading-tight">{shortGoodsTitle(item.title, item.content_name)}</p>
        {meta && <p className="mt-0.5 truncate text-3xs text-muted-foreground">{meta}</p>}
      </button>
      {actions.canWish && (
        <button
          type="button"
          disabled={wished || busy}
          onClick={() => actions.addWish(item)}
          aria-pressed={wished}
          aria-label={wished ? t("discover.tile.wished", { title: item.title }) : t("discover.tile.wish", { title: item.title })}
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur disabled:opacity-100"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={cn("h-4 w-4", wished ? "fill-primary text-primary" : "text-muted-foreground")} />
          )}
        </button>
      )}
    </div>
  );
}
