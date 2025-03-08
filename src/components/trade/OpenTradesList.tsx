
import { TradeCard } from "./TradeCard";
import { TradeRequest } from "./types";

interface OpenTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function OpenTradesList({ trades, onAccept, onReject }: OpenTradesListProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        現在オープンなトレードリクエストはありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => (
        <TradeCard
          key={trade.id}
          trade={trade}
          isPending={true}
          isOpenTrade={true}
          onAccept={() => onAccept(trade.id)}
          onReject={() => onReject(trade.id)}
        />
      ))}
    </div>
  );
}
