
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeRequest } from "./types";
import { TradeCard } from "./TradeCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AcceptedTradesListProps {
  trades: TradeRequest[];
  onOpenChat: (trade: TradeRequest) => void;
}

export function AcceptedTradesList({ trades, onOpenChat }: AcceptedTradesListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

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
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("trade.list.completeErrorDesc"),
      });
      return;
    }

    toast({
      title: t("trade.list.completedToastTitle"),
      description: t("trade.list.completedToastDesc"),
    });
  };

  return (
    <ScrollArea className="h-[calc(90vh-180px)]">
      <div className="space-y-8 pr-4">
        {trades.length === 0 ? (
          <p className="text-center text-gray-500">{t("trade.list.noOngoing")}</p>
        ) : (
          <>
            {notShippedTrades.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-500">{t("trade.list.awaitingShipping")}</h3>
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
                <h3 className="font-medium text-sm text-gray-500">{t("trade.list.shippedAwaitingArrival")}</h3>
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
