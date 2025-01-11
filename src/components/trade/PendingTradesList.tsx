import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";

interface PendingTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function PendingTradesList({ trades, onAccept, onReject }: PendingTradesListProps) {
  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">現在、受信したトレードリクエストはありません</p>
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