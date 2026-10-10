import { useState } from "react";
import { Ban, ChevronDown, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlocks";
import { cn } from "@/lib/utils";

/**
 * 設定: ブロックしたユーザーの一覧と解除。
 * 開くまで取得しない（設定を開くたびに余計な問い合わせをしない）。
 */
export function BlockedUsersSection() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-card rounded-2xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-2xl"
      >
        <Ban className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">{t("safety.blocked.title")}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <BlockedUsersList />}
    </section>
  );
}

function BlockedUsersList() {
  const { t } = useLanguage();
  const { data: blocks = [], isLoading, isError } = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <div className="border-t border-border px-4 py-3 space-y-3">
      <p className="text-xs text-muted-foreground">{t("safety.blocked.description")}</p>

      {isLoading ? (
        <Skeleton className="h-12 w-full rounded-xl" />
      ) : isError ? (
        <p className="text-sm text-destructive">{t("safety.blocked.loadFailed")}</p>
      ) : blocks.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-sm font-medium">{t("safety.blocked.empty")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("safety.blocked.emptyDesc")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => {
            const name = b.profile?.display_name || b.profile?.username || t("safety.blocked.anonymous");
            const pending = unblock.isPending && unblock.variables?.userId === b.blocked_id;
            return (
              <li key={b.blocked_id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={b.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  {b.profile?.username && (
                    <p className="text-xs text-muted-foreground truncate">@{b.profile.username}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unblock.isPending}
                  onClick={() => unblock.mutate({ userId: b.blocked_id })}
                >
                  {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {t("safety.blocked.unblock")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
