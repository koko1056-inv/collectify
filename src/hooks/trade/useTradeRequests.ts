import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TradeRequest } from "@/components/trade/types";
import { useAuth } from "@/contexts/AuthContext";

export function useTradeRequests() {
  const { user } = useAuth();
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [acceptedTrades, setAcceptedTrades] = useState<TradeRequest[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeRequest[]>([]);

  const fetchTradeRequests = async () => {
    if (!user) return;

    const { data: tradeRequestsData, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(
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
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching trade requests:", error);
      return;
    }

    setTradeRequests(tradeRequestsData);
  };

  const fetchAcceptedTrades = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(
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
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching accepted trades:", error);
      return;
    }

    setAcceptedTrades(data);
  };

  const fetchCompletedTrades = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(
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
      .eq("status", "completed")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching completed trades:", error);
      return;
    }

    setCompletedTrades(data);
  };

  const fetchAllTrades = () => {
    fetchTradeRequests();
    fetchAcceptedTrades();
    fetchCompletedTrades();
  };

  return {
    tradeRequests,
    acceptedTrades,
    completedTrades,
    fetchAllTrades,
  };
}