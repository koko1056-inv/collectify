import { memo, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

interface GoodsPickTileProps {
  image: string | null;
  title: string;
  subtitle?: string | null;
  /** 選択中（交換に出す・追加済みなど）。リングとチェックで示す */
  selected?: boolean;
  busy?: boolean;
  disabled?: boolean;
  /** 左上の印（「交換」など） */
  badge?: ReactNode;
  /** 右上の印（×2 など） */
  corner?: ReactNode;
  /** タイトルの下に置く1行のボタン風ラベル */
  footer?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * マイコレクションと同じ見た目のカードで、グッズを「選ぶ」ためのタイル。
 * 一覧（1行ずつ小さなサムネ）だと写真が小さく、何のグッズか見分けにくいので、
 * 持っているものを見るときと同じ、正方形の写真つきカードに揃える。
 * 写真は切り取らず全体を見せる（縦長・横長のグッズが混ざるため）。
 */
export const GoodsPickTile = memo(function GoodsPickTile({
  image,
  title,
  subtitle,
  selected = false,
  busy = false,
  disabled = false,
  badge,
  corner,
  footer,
  onClick,
  ariaLabel,
}: GoodsPickTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-pressed={selected}
      aria-label={ariaLabel ?? title}
      className={cn(
        "group relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary ring-2 ring-primary/60" : "border-border hover:border-primary/40",
        (disabled || busy) && "opacity-70"
      )}
    >
      <div className="relative aspect-square bg-muted/30">
        {image && (
          <img
            src={getOptimizedImageUrl(image, { width: 320 })}
            onError={fallbackToOriginal(image)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        )}
        {selected && <div className="absolute inset-0 bg-primary/10" />}
        {badge && <div className="absolute left-1.5 top-1.5">{badge}</div>}
        {corner && <div className="absolute right-1.5 top-1.5">{corner}</div>}
        {(selected || busy) && (
          <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <p className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground">{title}</p>
        {subtitle && <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>}
        {footer}
      </div>
    </button>
  );
});
