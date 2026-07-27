
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PendingTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function PendingTradesList({ trades, onAccept, onReject }: PendingTradesListProps) {
  const { t } = useLanguage();

  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-6 pr-4">
        {trades.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("trade.list.noPendingTitle")}
            description={t("trade.list.noPendingDesc")}
          />
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              isPending
              onAccept={onAccept}
              onReject={onReject}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
