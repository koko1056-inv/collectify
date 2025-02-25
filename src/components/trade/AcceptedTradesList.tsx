
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { useAuth } from "@/contexts/AuthContext";

interface AcceptedTradesListProps {
  trades: TradeRequest[];
  onOpenChat: (trade: TradeRequest) => void;
}

export function AcceptedTradesList({ trades, onOpenChat }: AcceptedTradesListProps) {
  const { user } = useAuth();
  
  // 郵送ステータスで取引を分類
  const notShippedTrades = trades.filter(trade => trade.shipping_status === 'not_shipped');
  const shippedTrades = trades.filter(trade => trade.shipping_status === 'shipped');

  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-8 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">現在、進行中のトレードはありません</p>
        ) : (
          <>
            {notShippedTrades.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500">郵送手続き待ち</h3>
                {notShippedTrades.map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onOpenChat={onOpenChat}
                    showShippingStatus
                  />
                ))}
              </div>
            )}

            {shippedTrades.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500">郵送済み - 到着待ち</h3>
                {shippedTrades.map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onOpenChat={onOpenChat}
                    showShippingStatus
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
