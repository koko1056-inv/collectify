import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_TIER, type BadgeDef } from "./badgeDefs";

const HEX = "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

/* 段ごとのメダルの地。状態の色ではなく、ブロンズ・シルバー・ゴールド・虹という素材の色（飾り） */
const RIM: Record<number, string> = {
  1: "linear-gradient(160deg,#f3c08d 0%,#c27a3d 55%,#8f4f1f 100%)",
  2: "linear-gradient(160deg,#ffffff 0%,#c3cbd6 50%,#8893a3 100%)",
  3: "linear-gradient(160deg,#fff1a8 0%,#f2c230 50%,#b7801a 100%)",
  4: "conic-gradient(from 200deg,#f472b6,#fbbf24,#34d399,#60a5fa,#a78bfa,#f472b6)",
};
const FACE: Record<number, string> = {
  1: "linear-gradient(160deg,#d9925a,#a45f2b)",
  2: "linear-gradient(160deg,#b9c2ce,#7c8798)",
  3: "linear-gradient(160deg,#f7cf4a,#cf9420)",
  4: "linear-gradient(160deg,#ec4899,#8b5cf6)",
};

/**
 * 実績バッジのメダル（六角形）。段（tier）が上がるほど、ブロンズ → シルバー → ゴールド → 虹 の地になる。
 * まだのものは灰色に鍵。下の4つの点が段の数
 */
export function BadgeMedal({
  def,
  tier,
  size = 64,
  isNew,
  className,
}: {
  def: BadgeDef;
  tier: number;
  size?: number;
  /** まだ見ていない新しい段（光らせる） */
  isNew?: boolean;
  className?: string;
}) {
  const Icon = def.icon;
  const locked = tier === 0;
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn("relative", isNew && "motion-safe:animate-pocke-pop")}
        style={{ width: size, height: size * 1.08 }}
        aria-hidden="true"
      >
        <div
          className={cn("absolute inset-0", locked && "bg-muted")}
          style={{ clipPath: HEX, background: locked ? undefined : RIM[tier] }}
        />
        <div
          className={cn("absolute flex items-center justify-center", locked && "bg-muted-foreground/15")}
          style={{ inset: size * 0.09, clipPath: HEX, background: locked ? undefined : FACE[tier] }}
        >
          {locked ? (
            <Lock className="text-muted-foreground/60" style={{ width: size * 0.3, height: size * 0.3 }} />
          ) : (
            <Icon className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" style={{ width: size * 0.4, height: size * 0.4 }} strokeWidth={2.4} />
          )}
        </div>
        {/* 左上のつや */}
        {!locked && (
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.45)_0%,transparent_38%)]"
            style={{ clipPath: HEX }}
          />
        )}
        {isNew && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />}
      </div>
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: MAX_TIER }, (_, i) => (
          <span
            key={i}
            className={cn("h-1 w-2.5 rounded-full", i < tier ? (tier === MAX_TIER ? "bg-primary" : "bg-points") : "bg-muted")}
          />
        ))}
      </div>
    </div>
  );
}
