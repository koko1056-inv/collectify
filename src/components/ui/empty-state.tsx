import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import { Pocke } from "@/components/pocke/Pocke";
import type { PockePose } from "@/components/pocke/pockeAssets";

interface EmptyStateProps {
  /** 何についての空かを示すアイコン。ポッケの足もとに小さく添える（ポッケを出さないときは今までどおり大きく出す） */
  icon?: LucideIcon;
  /** Primary message (alias: message). */
  title?: string;
  /** Backwards-compatible alias for `title`, matching the inline ExploreHub usage. */
  message?: string;
  /** Optional supporting copy below the title. */
  description?: string;
  /** Optional call-to-action rendered below the description. */
  action?: React.ReactNode;
  className?: string;
  /** ポッケの表情。既定は「考え中」（まだ何もないね、の顔） */
  pose?: PockePose;
  /** false でポッケを出さない（狭い枠の中など） */
  pocke?: boolean;
}

/**
 * まだ何もない・見つからないときの表示。
 *
 * 案内役のポッケが出て、何についての空かはポッケの足もとの小さなアイコンで示す
 * （Duolingo の空の画面でフクロウが出るのと同じ。素っ気ないアイコンだけより、次の一手を押してもらいやすい）。
 * 色はテーマのトークンだけを使うので、ライト・ダークどちらでもそのまま使える。
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  action,
  className,
  pose = "think",
  pocke = true,
}: EmptyStateProps) {
  const heading = title ?? message;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-12",
        className
      )}
    >
      {pocke ? (
        <div className="relative mb-3">
          <Pocke pose={pose} height={96} motion="pop" loading="lazy" />
          {Icon && (
            <IconTile size="sm" tone="primary" className="absolute -bottom-1 -right-3 bg-card shadow-sm ring-4 ring-background">
              <Icon />
            </IconTile>
          )}
        </div>
      ) : (
        Icon && (
          <IconTile size="lg" className="mb-4">
            <Icon />
          </IconTile>
        )
      )}
      {heading && (
        <p className="text-foreground font-medium mb-1">{heading}</p>
      )}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
