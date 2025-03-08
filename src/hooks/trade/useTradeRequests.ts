
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTradeState } from "./useTradeState";
import { useTradeActions } from "./useTradeActions";
import { 
  fetchPendingTradeRequests, 
  fetchAcceptedTradeRequests, 
  fetchCompletedTradeRequests,
  fetchOpenTradeRequests
} from "@/services/trade/tradeService";
import { TradeRequest } from "@/components/trade/types";

export function useTradeRequests() {
  const { user } = useAuth();
  const tradeState = useTradeState();
  const {
    tradeRequests, setTradeRequests,
    acceptedTrades, setAcceptedTrades,
    completedTrades, setCompletedTrades,
    openTrades, setOpenTrades,
    isLoading, setIsLoading,
    selectedRequest, setSelectedRequest,
    showCompletionModal, setShowCompletionModal,
    showChatModal, setShowChatModal,
    activeChatTradeId, setActiveChatTradeId
  } = tradeState;

  const { openChat, handleTradeResponse } = useTradeActions({
    setShowCompletionModal,
    setSelectedRequest,
    setActiveChatTradeId,
    setShowChatModal
  });

  // Fetch all trade data
  const fetchAllTradeData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const [pendingTrades, acceptedTradesData, completedTradesData, openTradesData] = await Promise.all([
        fetchPendingTradeRequests(user.id),
        fetchAcceptedTradeRequests(user.id),
        fetchCompletedTradeRequests(user.id),
        fetchOpenTradeRequests(user.id)
      ]);
      
      setTradeRequests(pendingTrades);
      setAcceptedTrades(acceptedTradesData);
      setCompletedTrades(completedTradesData);
      setOpenTrades(openTradesData);
    } catch (error) {
      console.error("Error fetching trade data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch only open trades
  const refreshOpenTrades = async () => {
    if (!user) return;
    
    try {
      const openTradesData = await fetchOpenTradeRequests(user.id);
      setOpenTrades(openTradesData);
    } catch (error) {
      console.error("Error refreshing open trades:", error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchAllTradeData();
    }
  }, [user]);

  // Handle trade acceptance/rejection
  const handleTradeResponseWrapper = async (tradeId: string, accept: boolean) => {
    if (!user) return;
    
    const request = tradeRequests.find(req => req.id === tradeId) || 
                   openTrades.find(req => req.id === tradeId);
                    
    if (request) {
      await handleTradeResponse(
        request,
        user.id,
        accept,
        fetchAllTradeData
      );
    }
  };

  return {
    // Trade data
    tradeRequests,
    acceptedTrades,
    completedTrades,
    openTrades,
    
    // UI state
    selectedRequest,
    showCompletionModal,
    showChatModal,
    activeChatTradeId,
    isLoading,
    
    // Actions
    setShowCompletionModal,
    setSelectedRequest,
    setShowChatModal,
    handleTradeResponse: handleTradeResponseWrapper,
    openChat,
    refreshOpenTrades
  };
}
