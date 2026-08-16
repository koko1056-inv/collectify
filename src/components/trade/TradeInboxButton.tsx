import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

import { TradeRequestsModal } from "./TradeRequestsModal";

/**
 * 進行中の交換を開く入口。
 *
 * 申し込みを送る画面はあったのに、届いた申し込みを見る場所がどこからも
 * 開けなかった。交換は相手の返事があって初めて成立するので、
 * 受け取り箱に行けないのは機能が無いのと同じだった。
 */
export function TradeInboxButton({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "full";
  className?: string;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // 「自分の番」の件数。返事待ちの申請と、自分がまだ報告していない進行中。
  const { data: actionable = 0 } = useQuery({
    queryKey: ["trade-inbox-count", user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trade_requests")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("status", "pending")
        .neq("sender_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="outline"
          size="icon"
          className={cn("relative h-8 w-8", className)}
          onClick={() => setIsOpen(true)}
          aria-label={t("trade.inbox.open")}
        >
          <Inbox className="h-4 w-4" />
          {actionable > 0 && <CountDot count={actionable} />}
        </Button>
      ) : (
        <Button
          variant="outline"
          className={cn("relative w-full justify-start gap-2", className)}
          onClick={() => setIsOpen(true)}
        >
          <Inbox className="h-4 w-4" />
          {t("trade.inbox.open")}
          {actionable > 0 && (
            <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
              {actionable}
            </span>
          )}
        </Button>
      )}

      <TradeRequestsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function CountDot({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
      {count > 9 ? "9+" : count}
    </span>
  );
}
