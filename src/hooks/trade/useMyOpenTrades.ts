
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TradeRequest } from "@/components/trade/types";
import { useAuth } from "@/contexts/AuthContext";

export function useMyOpenTrades() {
  const [isLoading, setIsLoading] = useState(true);
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const { user } = useAuth();

  const fetchMyOpenTradeRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trade_requests")
        .select(`
          id,
          message,
          status,
          shipping_status,
          is_open,
          sender:profiles!trade_requests_sender_id_fkey(
            id,
            username,
            display_name
          ),
          receiver:profiles!trade_requests_receiver_id_fkey(
            id,
            username,
            display_name
          ),
          offered_item:user_items!trade_requests_offered_item_id_fkey(
            id,
            title,
            image
          ),
          requested_item:user_items!trade_requests_requested_item_id_fkey(
            id,
            title,
            image
          )
        `)
        .eq("sender_id", user.id)
        .eq("is_open", true)
        .eq("status", "pending");

      if (error) throw error;
      console.log("My open trade requests:", data);
      setTradeRequests(data as unknown as TradeRequest[]);
    } catch (error) {
      console.error("Error fetching trade requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSuccess = (tradeId: string) => {
    setTradeRequests(tradeRequests.filter(trade => trade.id !== tradeId));
  };

  // Initial data fetch
  useEffect(() => {
    fetchMyOpenTradeRequests();
  }, [user]);

  // Set up real-time subscription for trade requests
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('trade_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trade_requests',
        filter: `sender_id=eq.${user.id}`,
      }, () => {
        console.log('Trade requests changed, refreshing...');
        fetchMyOpenTradeRequests();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    isLoading,
    tradeRequests,
    fetchMyOpenTradeRequests,
    handleCancelSuccess
  };
}
