import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";

interface CompletedTradesListProps {
  trades: TradeRequest[];
}

export function CompletedTradesList({ trades }: CompletedTradesListProps) {
  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">完了したトレードはありません</p>
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