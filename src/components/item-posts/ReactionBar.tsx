import { PackageCheck, Gift, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  REACTION_KINDS,
  useItemPostReactions,
  useToggleReaction,
  type ReactionKind,
} from "@/hooks/item-posts/useItemPostReactions";

const ICONS: Record<ReactionKind, typeof Sparkles> = {
  have: PackageCheck,
  want: Gift,
  love: Sparkles,
};

/**
 * 投稿への1タップ反応。コメントを書くほどではないが何か伝えたい、という気持ちの受け皿。
 * 「持ってる！」は投稿者に「同担がいた」と通知される。
 */
export function ReactionBar({ postId, className }: { postId: string; className?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { get } = useItemPostReactions([postId]);
  const toggle = useToggleReaction();
  const summary = get(postId);

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label={t("engage.posts.reactionsLabel")}>
      {REACTION_KINDS.map((kind) => {
        const Icon = ICONS[kind];
        const active = summary.mine.has(kind);
        const count = summary.counts[kind];
        return (
          <button
            key={kind}
            type="button"
            disabled={!user || toggle.isPending}
            aria-pressed={active}
            onClick={() => toggle.mutate({ postId, kind, active })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(`engage.posts.reaction.${kind}`)}
            {count > 0 && <span className="tabular-nums text-xs opacity-80">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
