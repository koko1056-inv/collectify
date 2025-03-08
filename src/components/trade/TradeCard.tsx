
import React from "react";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Truck, Clock, CheckCircle, Globe } from "lucide-react";

interface TradeCardProps {
  trade: TradeRequest;
  isPending?: boolean;
  isCompleted?: boolean;
  isOpenTrade?: boolean;
  showShippingStatus?: boolean;
  onAccept?: (tradeId: string) => void;
  onReject?: (tradeId: string) => void;
  onOpenChat?: (trade: TradeRequest) => void;
  onComplete?: (trade: TradeRequest) => void;
}

export function TradeCard({ 
  trade, 
  isPending, 
  isCompleted,
  isOpenTrade,
  showShippingStatus,
  onAccept, 
  onReject, 
  onOpenChat,
  onComplete 
}: TradeCardProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isPending && !isCompleted && user) {
      fetchUnreadMessages();
      subscribeToMessages();
    }
  }, [trade.id, user, isPending, isCompleted]);

  const fetchUnreadMessages = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("trade_request_id", trade.id)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `trade_request_id=eq.${trade.id}`,
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const tradePartner = user?.id === trade.sender.id ? trade.receiver : trade.sender;
  const tradePartnerName = tradePartner?.display_name || tradePartner?.username || "";

  const renderShippingStatus = () => {
    if (!showShippingStatus) return null;

    switch (trade.shipping_status) {
      case 'not_shipped':
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm">郵送手続き待ち</span>
          </div>
        );
      case 'shipped':
        return (
          <div className="flex items-center gap-1 text-blue-600">
            <Truck className="h-4 w-4" />
            <span className="text-sm">発送済み - 到着待ち</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {tradePartnerName}
          </span>
          <span className="text-sm text-gray-500">
            {isPending ? "からのリクエスト" : isCompleted ? "とのトレード（完了）" : "とのトレード"}
          </span>
          {isOpenTrade && (
            <div className="flex items-center gap-1 text-green-600">
              <Globe className="h-4 w-4" />
              <span className="text-sm">オープントレード</span>
            </div>
          )}
        </div>
        {renderShippingStatus()}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">提供アイテム:</p>
          <img
            src={trade.offered_item.image}
            alt={trade.offered_item.title}
            className="w-full aspect-square object-cover rounded-md"
          />
          <p className="text-sm truncate">{trade.offered_item.title}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">リクエストアイテム:</p>
          <img
            src={trade.requested_item.image}
            alt={trade.requested_item.title}
            className="w-full aspect-square object-cover rounded-md"
          />
          <p className="text-sm truncate">{trade.requested_item.title}</p>
        </div>
      </div>
      {trade.message && (
        <div className="text-sm bg-gray-50 rounded p-2">
          {trade.message}
        </div>
      )}
      {isPending ? (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onReject?.(trade.id)}
          >
            拒否
          </Button>
          <Button
            onClick={() => onAccept?.(trade.id)}
          >
            承認
          </Button>
        </div>
      ) : !isCompleted && (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full relative"
            onClick={() => onOpenChat?.(trade)}
          >
            チャットを開く
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          {trade.shipping_status === 'shipped' && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onComplete?.(trade)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              トレードを完了する
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
