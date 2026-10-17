import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 3つの目標の色（集める・育てる・つながる）。リングの弧と、目標の行の印で同じ色を使う */
export const RING_GOALS = [
  { key: "collect", stroke: "stroke-primary", text: "text-primary", bg: "bg-primary" },
  { key: "care", stroke: "stroke-points", text: "text-points", bg: "bg-points" },
  { key: "social", stroke: "stroke-info", text: "text-info", bg: "bg-info" },
] as const;

/**
 * 今日のポッケリング。円を3つの弧に分け、できた目標の弧に色がつく（Apple のアクティビティリングと Duolingo の毎日の目標の間）。
 * children はリングの真ん中に置く（ポッケ・数字など）
 */
export function PockeRing({
  done,
  size,
  stroke,
  children,
  className,
}: {
  done: [boolean, boolean, boolean];
  size: number;
  stroke: number;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // 弧と弧のすきま（線の丸い端の分も空ける）
  const gap = stroke * 1.15 + c * 0.015;
  const seg = c / 3 - gap;

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {RING_GOALS.map((g, i) => (
          <circle
            key={g.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${seg} ${c - seg}`}
            strokeDashoffset={-(i * (c / 3) + gap / 2)}
            className={cn("transition-[stroke] duration-500", done[i] ? g.stroke : "stroke-muted")}
          />
        ))}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
