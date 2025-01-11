import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";

interface AcceptedTradesListProps {
  trades: TradeRequest[];
  onOpenChat: (trade: TradeRequest) => void;
}

export function AcceptedTradesList({ trades, onOpenChat }: AcceptedTradesListProps) {
  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">現在、進行中のトレードはありません</p>
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onOpenChat={onOpenChat}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}