
import { useEffect } from "react";
import { TradeCard } from "./TradeCard";
import { TradeRequest } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateOpenTradeButton } from "./CreateOpenTradeButton";
import { OpenTradeRequests } from "./OpenTradeRequests";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OpenTradesListProps {
  trades: TradeRequest[];
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
  onTradeCreated?: () => void;
  onRefresh?: () => void;
}

export function OpenTradesList({ 
  trades, 
  onAccept, 
  onReject, 
  onTradeCreated,
  onRefresh 
}: OpenTradesListProps) {
  const { user } = useAuth();

  // リアルタイムサブスクリプションの設定
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('open_trades_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trade_requests',
        filter: `is_open=eq.true`,
      }, () => {
        console.log('Open trades changed, refreshing...');
        if (onRefresh) onRefresh();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onRefresh]);

  return (
    <div className="space-y-6">
      <CreateOpenTradeButton onTradeCreated={onTradeCreated || onRefresh} />
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-4">オープントレード一覧</h2>
        <ScrollArea className="h-[calc(50vh-220px)]">
          <div className="space-y-6 pr-4">
            {trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                <img src="/placeholder.svg" alt="No open trades" className="w-24 h-24 mb-4 opacity-50" />
                <p>現在オープンなトレードリクエストはありません</p>
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
