import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePartnerCollection, type TradePartnerItem } from "@/hooks/useTradeMatches";

interface PartnerCollectionPickerProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  /** 相手がほしがっている自分の品の名前（案内文に使う） */
  myItemTitle: string;
  onPick: (item: TradePartnerItem) => void;
  onOpenChat: () => void;
}

/**
 * 相手のコレクションから、もらいたい品を選ぶ。
 *
 * 相手が何も「交換に出す」にしていないと、「代わりにもらえるもの」が空になる。
 * そこで止めずに、相手の持ち物全体から選んで「相談」として申し込めるようにする。
 * 選んだあとは、いつもの申し込み画面（相談モード）に渡す。
 */
export function PartnerCollectionPicker({
  open,
  onClose,
  partnerId,
  partnerName,
  myItemTitle,
  onPick,
  onOpenChat,
}: PartnerCollectionPickerProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading, isError, refetch } = usePartnerCollection(open ? partnerId : null);

  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;
  }, [items, search]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="px-4 pb-3 pt-4">
          <DialogTitle className="text-base">
            {t("trade.matching.partnerCollectionTitle", { name: partnerName })}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("trade.matching.partnerCollectionDesc", { mine: myItemTitle })}
          </DialogDescription>
        </DialogHeader>

        {items.length > 9 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("trade.matching.partnerCollectionSearch")}
                className="pl-9"
              />
            </div>
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4 [&>[data-radix-scroll-area-viewport]>div]:!block">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState title={t("trade.matching.theyWantLoadFailed")} onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            // 非公開、またはグッズが無い。チャットで聞く道だけは残す
            <EmptyState
              className="py-8"
              title={t("trade.matching.partnerCollectionEmpty")}
              description={t("trade.matching.partnerCollectionEmptyDesc")}
              action={
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenChat}>
                  <MessageCircle className="h-4 w-4" />
                  {t("trade.matching.theyWantAskChat")}
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("trade.matching.partnerCollectionNoMatch")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 pb-2 sm:grid-cols-4">
              {rows.map((item) => (
                <div key={item.id} data-testid="partner-collection-item" className="min-w-0">
                  <GoodsPickTile
                    image={item.image}
                    title={item.title}
                    onClick={() => onPick(item)}
                    ariaLabel={item.title}
                    badge={
                      item.already_requested ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-3xs font-semibold text-muted-foreground">
                          {t("trade.matching.theyWantRequested")}
                        </span>
                      ) : item.for_trade ? (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-3xs font-semibold text-primary-foreground">
                          {t("trade.request.offeringBadge")}
                        </span>
                      ) : undefined
                    }
                    footer={
                      <span className="mt-auto rounded-md bg-muted py-1 text-center text-3xs font-semibold text-foreground">
                        {t("trade.matching.partnerCollectionPick")}
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
