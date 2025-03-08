
import { useLanguage } from "@/contexts/LanguageContext";
import { Loading } from "@/components/ui/loading";
import { useTradeRequests } from "@/hooks/trade/useTradeRequests";
import { TradeModals } from "@/components/trade/TradeModals";
import { TradeTabs } from "@/components/trade/TradeTabs";

export default function TradeRequests() {
  const { t } = useLanguage();
  const {
    tradeRequests,
    acceptedTrades,
    completedTrades,
    openTrades,
    selectedRequest,
    showCompletionModal,
    showChatModal,
    activeChatTradeId,
    isLoading,
    setShowCompletionModal,
    setSelectedRequest,
    setShowChatModal,
    handleTradeResponse,
    openChat
  } = useTradeRequests();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">トレード管理</h1>
      
      <TradeTabs
        tradeRequests={tradeRequests}
        acceptedTrades={acceptedTrades}
        completedTrades={completedTrades}
        openTrades={openTrades}
        handleTradeResponse={handleTradeResponse}
        openChat={openChat}
      />

      <TradeModals
        selectedRequest={selectedRequest}
        showCompletionModal={showCompletionModal}
        showChatModal={showChatModal}
        activeChatTradeId={activeChatTradeId}
        setShowCompletionModal={setShowCompletionModal}
        setSelectedRequest={setSelectedRequest}
        setShowChatModal={setShowChatModal}
      />
    </div>
  );
}
