
import { TradeCard } from "./TradeCard";
import { TradeRequest } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateOpenTradeButton } from "./CreateOpenTradeButton";
import { OpenTradeRequests } from "./OpenTradeRequests";

interface OpenTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function OpenTradesList({ trades, onAccept, onReject }: OpenTradesListProps) {
  return (
    <div className="space-y-6">
      <CreateOpenTradeButton onTradeCreated={() => {}} />
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-4">オープントレード一覧</h2>
        <ScrollArea className="h-[calc(50vh-220px)]">
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
      </div>
      
      <OpenTradeRequests />
    </div>
  );
}
