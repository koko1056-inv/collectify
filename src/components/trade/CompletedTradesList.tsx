import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle } from "lucide-react";

interface CompletedTradesListProps {
  trades: TradeRequest[];
}

export function CompletedTradesList({ trades }: CompletedTradesListProps) {
  const { t } = useLanguage();

  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <EmptyState icon={CheckCircle} title={t("trade.list.noCompleted")} />
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              isCompleted
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}