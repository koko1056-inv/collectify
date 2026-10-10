import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * アイコンを入れる「面」。アプリ全体でこれ1つに揃える。
 *
 * 以前は画面ごとに、丸・四角・グラデーション・虹色（sky→blue、orange→rose など）と
 * 9通りほどの包み方があり、ちぐはぐで安っぽく見えていた。
 * - 形は角丸の四角だけ（丸は人のアイコンとバッジに取っておく）
 * - 色は意味のトークンの薄い面＋同じ色の細い内枠（ring-inset）。グラデーションは使わない
 * - 中のアイコンの大きさと線の太さは、面の大きさから決まる（呼ぶ側で h-/w- を付けない）
 */
export type IconTileTone = "muted" | "primary" | "points" | "success" | "warning" | "info" | "destructive";
export type IconTileSize = "xs" | "sm" | "md" | "lg";

const TONES: Record<IconTileTone, string> = {
  muted: "bg-muted text-muted-foreground ring-foreground/5",
  primary: "bg-primary/10 text-primary ring-primary/15",
  points: "bg-points-soft text-points ring-points/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  info: "bg-info-soft text-info ring-info/20",
  destructive: "bg-destructive/10 text-destructive ring-destructive/15",
};

/** 面の大きさ → 角丸・アイコンの大きさ・線の太さ（大きいアイコンほど線を細くして重く見せない） */
const SIZES: Record<IconTileSize, string> = {
  xs: "h-6 w-6 rounded-md [&_svg]:size-3.5 [&_svg]:stroke-[2.25]",
  sm: "h-8 w-8 rounded-lg [&_svg]:size-4 [&_svg]:stroke-2",
  md: "h-10 w-10 rounded-xl [&_svg]:size-5 [&_svg]:stroke-[1.85]",
  lg: "h-16 w-16 rounded-2xl [&_svg]:size-8 [&_svg]:stroke-[1.6]",
};

export function IconTile({
  children,
  tone = "muted",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: IconTileTone;
  size?: IconTileSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center ring-1 ring-inset [&_svg]:shrink-0",
        TONES[tone],
        SIZES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
