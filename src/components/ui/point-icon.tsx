import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * ポイントの印。アプリ全体でこれ1つに揃える。
 *
 * 以前は ★ の塗りが yellow-400 / primary / points と3通り、Coins アイコンも混ざっていた。
 * ここではメダルのような丸（points の色・内側に細い縁）に白い星を描く。
 * 16px でもつぶれないよう、SVG で直接描く（lucide の Star を重ねると小さいとき線が太る）。
 */
export function PointIcon({ size = 16, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
    >
      <defs>
        {/* 左上から光が当たったような艶。メダルらしさを出す */}
        <linearGradient id={`${id}-sheen`} x1="4" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="hsl(var(--points))" />
      <circle cx="12" cy="12" r="12" fill={`url(#${id}-sheen)`} />
      <circle cx="12" cy="12" r="9.6" fill="none" stroke="hsl(var(--points-foreground))" strokeOpacity="0.35" strokeWidth="1" />
      <path
        d="M12 5.6l1.88 3.9 4.27.55-3.12 2.96.8 4.23L12 15.17l-3.83 2.07.8-4.23-3.12-2.96 4.27-.55z"
        fill="hsl(var(--points-foreground))"
        strokeLinejoin="round"
      />
    </svg>
  );
}
