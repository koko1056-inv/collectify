
import React from "react";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Truck, Clock, CheckCircle, Globe, MessageCircle, X, Check, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
          <div className={`flex items-center gap-1 text-gray-700 bg-gray-100 px-2 ${isMobile ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} rounded-full`}>
            <Clock className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
            <span>郵送手続き待ち</span>
          </div>
        );
      case 'shipped':
        return (
          <div className={`flex items-center gap-1 text-gray-700 bg-gray-100 px-2 ${isMobile ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} rounded-full`}>
            <Truck className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
            <span>発送済み - 到着待ち</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`border border-gray-200 rounded-xl ${isMobile ? 'p-2 space-y-2 max-w-[300px] mx-auto' : 'p-4 space-y-4'} bg-white shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in`}>
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`${isMobile ? 'text-sm' : 'text-md'} font-medium text-gray-900`}>{tradePartnerName}</span>
          {isOpenTrade && (
            <div className={`flex items-center gap-1 text-gray-700 bg-gray-100 px-2 ${isMobile ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} rounded-full`}>
              <Globe className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
              <span>オープン</span>
            </div>
          )}
        </div>
        {isPending && (
          <div className={`bg-yellow-100 text-yellow-700 px-2 ${isMobile ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} rounded-full flex items-center`}>
            <Clock className={`${isMobile ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'}`} />
            <span>保留中</span>
          </div>
        )}
        {renderShippingStatus()}
      </div>

      {/* トレードユーザー表示 */}
      <div className={`flex items-center justify-center gap-2 ${isMobile ? 'py-1' : 'py-2 gap-3'}`}>
        <div className="flex flex-col items-center">
          <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`}>
            {trade.sender.id === user?.id ? (
              <AvatarImage 
                src={user.user_metadata?.avatar_url || '/placeholder.svg'} 
                alt="Your avatar" 
              />
            ) : (
              <AvatarImage 
                src={trade.sender.avatar_url || '/placeholder.svg'} 
                alt={trade.sender.username} 
              />
            )}
            <AvatarFallback>{trade.sender.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} mt-0.5`}>{trade.sender.id === user?.id ? 'あなた' : trade.sender.username}</span>
        </div>
        
        <ArrowLeftRight className={`text-blue-500 ${isMobile ? 'h-4 w-4' : 'size-20'}`} />
        
        <div className="flex flex-col items-center">
          <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`}>
            {trade.receiver?.id === user?.id ? (
              <AvatarImage 
                src={user.user_metadata?.avatar_url || '/placeholder.svg'}
                alt="Your avatar" 
              />
            ) : (
              <AvatarImage 
                src={trade.receiver?.avatar_url || '/placeholder.svg'} 
                alt={trade.receiver?.username || 'Receiver'} 
              />
            )}
            <AvatarFallback>{trade.receiver?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} mt-0.5`}>{trade.receiver?.id === user?.id ? 'あなた' : trade.receiver?.username || '未定'}</span>
        </div>
      </div>

      {/* アイテム情報 - モバイル向けにコンパクト化 */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-1 gap-4'}`}>
        {/* 相手の提供アイテム */}
        <div className={`${isMobile ? 'space-y-0.5' : 'space-y-1'}`}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 font-medium`}>{isMobile ? '相手:' : '相手の提供アイテム:'}</p>
          <div className="relative">
            <img
              src={trade.offered_item.image}
              alt={trade.offered_item.title}
              className={`w-full ${isMobile ? 'aspect-square h-24' : 'aspect-square'} object-cover rounded-lg shadow-sm`}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
              <p className={`${isMobile ? 'text-xs line-clamp-1' : 'text-sm'} text-white`}>{trade.offered_item.title}</p>
            </div>
          </div>
        </div>
        
        {/* あなたの提供アイテム */}
        <div className={`${isMobile ? 'space-y-0.5' : 'space-y-1'}`}>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 font-medium`}>{isMobile ? 'あなた:' : 'あなたの提供アイテム:'}</p>
          <div className="relative">
            <img
              src={trade.requested_item.image}
              alt={trade.requested_item.title}
              className={`w-full ${isMobile ? 'aspect-square h-24' : 'aspect-square'} object-cover rounded-lg shadow-sm`}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
              <p className={`${isMobile ? 'text-xs line-clamp-1' : 'text-sm'} text-white`}>{trade.requested_item.title}</p>
            </div>
          </div>
        </div>
      </div>

      {trade.message && (
        <div className={`${isMobile ? 'text-xs bg-gray-50 rounded-lg p-2 border-l-2 border-gray-300 italic line-clamp-2' : 'text-sm bg-gray-50 rounded-lg p-3 border-l-4 border-gray-300 italic'}`}>
          {trade.message}
        </div>
      )}
      
      {/* アクションボタン */}
      {isPending ? (
        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={() => onReject?.(trade.id)}
            className={`flex-1 rounded-lg border-red-300 hover:bg-red-50 hover:text-red-600 text-red-500 ${isMobile ? 'text-xs py-1' : ''}`}
          >
            <X className={`${isMobile ? 'mr-0.5 h-3 w-3' : 'mr-1 h-4 w-4'}`} />
            {isMobile ? '拒否' : '拒否する'}
          </Button>
          <Button
            onClick={() => onAccept?.(trade.id)}
            className={`flex-1 rounded-lg bg-blue-500 hover:bg-blue-600 ${isMobile ? 'text-xs py-1' : ''}`}
          >
            <Check className={`${isMobile ? 'mr-0.5 h-3 w-3' : 'mr-1 h-4 w-4'}`} />
            {isMobile ? '承認' : '承認する'}
          </Button>
        </div>
      ) : !isCompleted && (
        <div className="flex flex-col gap-2">
          <Button
            className={`w-full relative rounded-lg bg-black hover:bg-gray-800 transition-shadow ${isMobile ? 'text-xs py-1' : ''}`}
            onClick={() => onOpenChat?.(trade)}
          >
            <MessageCircle className={`${isMobile ? 'mr-0.5 h-3 w-3' : 'mr-1 h-4 w-4'}`} />
            チャットを開く
            {unreadCount > 0 && (
              <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full ${isMobile ? 'w-4 h-4 text-[10px]' : 'w-5 h-5'} flex items-center justify-center animate-pulse`}>
                {unreadCount}
              </span>
            )}
          </Button>
          {trade.shipping_status === 'shipped' && (
            <Button
              variant="outline"
              className={`w-full rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 ${isMobile ? 'text-xs py-1' : ''}`}
              onClick={() => onComplete?.(trade)}
            >
              <CheckCircle className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
              {isMobile ? 'トレード完了' : 'トレードを完了する'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
