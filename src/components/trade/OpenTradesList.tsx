
import { TradeCard } from "./TradeCard";
import { TradeRequest } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OpenTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function OpenTradesList({ trades, onAccept, onReject }: OpenTradesListProps) {
  return (
    <ScrollArea className="h-[calc(90vh-220px)]">
      <div className="space-y-4 pr-4">
        {trades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            現在オープンなトレードリクエストはありません
          </div>
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              isPending={true}
              isOpenTrade={true}
              onAccept={() => onAccept(trade.id)}
              onReject={() => onReject(trade.id)}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
