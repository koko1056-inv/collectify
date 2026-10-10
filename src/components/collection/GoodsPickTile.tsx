import { memo, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
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
  /** タイル下部（名前・ボタン）を押したときの動作。追加・選択など */
  onClick?: () => void;
  /**
   * 写真を押したときの動作（詳細を開くなど）。
   * 渡さない場合は写真も onClick と同じ動きになる。
   */
  onImageClick?: () => void;
  ariaLabel?: string;
  imageAriaLabel?: string;
}

/**
 * マイコレクションと同じ見た目のカードで、グッズを「選ぶ」ためのタイル。
 * 一覧（1行ずつ小さなサムネ）だと写真が小さく、何のグッズか見分けにくいので、
 * 持っているものを見るときと同じ、正方形の写真つきカードに揃える。
 * 写真は切り取らず全体を見せる（縦長・横長のグッズが混ざるため）。
 *
 * onImageClick を渡すと、写真は「詳細を見る」、下部は「追加・選択」と押す場所で動作を分けられる。
 * ボタンの中にボタンは置けないので、外側は div にして2つのボタンを並べている。
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
  onImageClick,
  ariaLabel,
  imageAriaLabel,
}: GoodsPickTileProps) {
  const { t } = useLanguage();
  const actionDisabled = disabled || busy;
  // 公式の写真が使えない商品は、目印の画像になっている。追加したあとに、自分の写真を入れられる
  const noPhoto = !image || image === "/placeholder.svg";
  // 写真に専用の動作がある場合、追加済みでも詳細は開けるようにする
  const imageDisabled = onImageClick ? false : actionDisabled;
  return (
    <div
      className={cn(
        "group relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-left transition-all",
        selected ? "border-primary ring-2 ring-primary/60" : "border-border hover:border-primary/40",
        actionDisabled && !onImageClick && "opacity-70"
      )}
    >
      <button
        type="button"
        onClick={onImageClick ?? onClick}
        disabled={imageDisabled}
        aria-label={onImageClick ? imageAriaLabel ?? title : ariaLabel ?? title}
        aria-pressed={onImageClick ? undefined : selected}
        className="relative block aspect-square w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {image && (
          <img
            src={getOptimizedImageUrl(image, { width: 320 })}
            onError={fallbackToOriginal(image)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        {noPhoto && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-3xs font-medium text-muted-foreground shadow-sm">
            {t("collectionScreen.cardImage.noPhoto")}
          </span>
        )}
        {selected && <div className="absolute inset-0 bg-primary/10" />}
        {badge && <div className="absolute left-1.5 top-1.5">{badge}</div>}
        {corner && <div className="absolute right-1.5 top-1.5">{corner}</div>}
        {(selected || busy) && (
          <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onClick}
        disabled={actionDisabled}
        aria-pressed={selected}
        aria-label={ariaLabel ?? title}
        className={cn(
          "flex flex-1 flex-col gap-1 p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          actionDisabled && "opacity-70"
        )}
      >
        <span className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-foreground">{title}</span>
        {subtitle && <span className="truncate text-3xs text-muted-foreground">{subtitle}</span>}
        {footer}
      </button>
    </div>
  );
});
