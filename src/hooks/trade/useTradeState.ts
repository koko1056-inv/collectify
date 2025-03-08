
import { useState } from "react";
import { TradeRequest } from "@/components/trade/types";

export function useTradeState() {
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [acceptedTrades, setAcceptedTrades] = useState<TradeRequest[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeRequest[]>([]);
  const [openTrades, setOpenTrades] = useState<TradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  return {
    // Trade data states
    tradeRequests,
    setTradeRequests,
    acceptedTrades,
    setAcceptedTrades,
    completedTrades,
    setCompletedTrades,
    openTrades,
    setOpenTrades,
    
    // UI states
    selectedRequest,
    setSelectedRequest,
    showCompletionModal,
    setShowCompletionModal,
    showChatModal,
    setShowChatModal,
    activeChatTradeId,
    setActiveChatTradeId,
    isLoading,
    setIsLoading
  };
}
