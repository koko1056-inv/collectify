
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
      <div className="space-y-6 pr-4">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <img src="/placeholder.svg" alt="No trades" className="w-24 h-24 mb-4 opacity-50" />
            <p>現在、受信したトレードリクエストはありません</p>
          </div>
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
