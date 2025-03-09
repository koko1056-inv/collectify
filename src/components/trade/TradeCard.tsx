
import React from "react";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Truck, Clock, CheckCircle, Globe, MessageCircle, X, Check } from "lucide-react";

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
          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-full text-xs">
            <Clock className="h-3 w-3" />
            <span>郵送手続き待ち</span>
          </div>
        );
      case 'shipped':
        return (
          <div className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-1 rounded-full text-xs">
            <Truck className="h-3 w-3" />
            <span>発送済み - 到着待ち</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-purple-700">
            {tradePartnerName}
          </span>
          <span className="text-sm text-gray-500">
            {isPending ? "からのリクエスト" : isCompleted ? "とのトレード（完了）" : "とのトレード"}
          </span>
          {isOpenTrade && (
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
              <Globe className="h-3 w-3" />
              <span>オープントレード</span>
            </div>
          )}
        </div>
        {renderShippingStatus()}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">提供アイテム:</p>
          <div className="relative group">
            <img
              src={trade.offered_item.image}
              alt={trade.offered_item.title}
              className="w-full aspect-square object-cover rounded-lg shadow-sm group-hover:scale-[1.02] transition-transform duration-200"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
              <p className="text-sm truncate text-white">{trade.offered_item.title}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">リクエストアイテム:</p>
          <div className="relative group">
            <img
              src={trade.requested_item.image}
              alt={trade.requested_item.title}
              className="w-full aspect-square object-cover rounded-lg shadow-sm group-hover:scale-[1.02] transition-transform duration-200"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
              <p className="text-sm truncate text-white">{trade.requested_item.title}</p>
            </div>
          </div>
        </div>
      </div>
      {trade.message && (
        <div className="text-sm bg-gray-50 rounded-lg p-3 border-l-4 border-purple-300 italic">
          {trade.message}
        </div>
      )}
      {isPending ? (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onReject?.(trade.id)}
            className="rounded-full"
            size="sm"
          >
            <X className="mr-1 h-4 w-4 text-red-500" />
            拒否
          </Button>
          <Button
            onClick={() => onAccept?.(trade.id)}
            className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-md transition-shadow"
            size="sm"
          >
            <Check className="mr-1 h-4 w-4" />
            承認
          </Button>
        </div>
      ) : !isCompleted && (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full relative rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-md transition-shadow"
            onClick={() => onOpenChat?.(trade)}
          >
            <MessageCircle className="mr-1 h-4 w-4" />
            チャットを開く
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </Button>
          {trade.shipping_status === 'shipped' && (
            <Button
              variant="outline"
              className="w-full rounded-full border-green-300 text-green-700 hover:bg-green-50"
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
