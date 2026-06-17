import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional icon shown in a soft rounded container above the title. */
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
}

/**
 * Reusable empty / no-results state.
 *
 * Centered column with generous vertical padding, a muted icon in a soft
 * rounded container, a foreground title, muted description, and an optional
 * action. Uses theme tokens only so it adapts to light/dark themes.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  action,
  className,
}: EmptyStateProps) {
  const heading = title ?? message;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-12",
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
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
