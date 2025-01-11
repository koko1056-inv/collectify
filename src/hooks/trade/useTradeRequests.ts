import { useState, useEffect } from "react";
import { TradeRequest } from "@/components/trade/types";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTradeData } from "./useTradeData";

export function useTradeRequests() {
  const { user } = useAuth();
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [acceptedTrades, setAcceptedTrades] = useState<TradeRequest[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeRequest[]>([]);

  const fetchTradeRequests = async () => {
    if (!user) return;
    const data = await fetchTradeData(user.id, "pending");
    setTradeRequests(data);
  };

  const fetchAcceptedTrades = async () => {
    if (!user) return;
    const data = await fetchTradeData(user.id, "accepted");
    setAcceptedTrades(data);
  };

  const fetchCompletedTrades = async () => {
    if (!user) return;
    const data = await fetchTradeData(user.id, "completed");
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