import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TradeCardMessageProps {
  tradeId: string;
}

export function TradeCardMessage({ tradeId }: TradeCardMessageProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadMessages();
      const unsubscribe = subscribeToMessages();
      return () => {
        unsubscribe();
      };
    }
  }, [tradeId, user]);

  const fetchUnreadMessages = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("trade_request_id", tradeId)
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
          filter: `trade_request_id=eq.${tradeId}`,
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

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount}
    </span>
  );
}