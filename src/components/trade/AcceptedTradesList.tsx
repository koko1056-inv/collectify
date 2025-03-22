import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/utils/sound";

interface AcceptedTradesListProps {
  trades: TradeRequest[];
  onOpenChat: (trade: TradeRequest) => void;
}

export function AcceptedTradesList({ trades, onOpenChat }: AcceptedTradesListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const notShippedTrades = trades.filter(trade => trade.shipping_status === 'not_shipped');
  const shippedTrades = trades.filter(trade => trade.shipping_status === 'shipped');

  const handleComplete = async (trade: TradeRequest) => {
    if (!user) return;

    const { error } = await supabase
      .from("trade_requests")
      .update({ 
        status: 'completed',
        shipping_status: 'completed'
      })
      .eq("id", trade.id);

    if (error) {
      playSound('error', 0.5);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードの完了に失敗しました。",
      });
      return;
    }

    playSound('success', 0.5);
    toast({
      title: "トレード完了",
      description: "トレードが完了しました。お疲れ様でした！",
    });
  };

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
                    onComplete={handleComplete}
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
