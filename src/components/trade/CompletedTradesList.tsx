import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompletedTradesListProps {
  trades: TradeRequest[];
}

export function CompletedTradesList({ trades }: CompletedTradesListProps) {
  const { t } = useLanguage();

  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">{t("trade.list.noCompleted")}</p>
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