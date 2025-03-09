import { useLanguage } from "@/contexts/LanguageContext";
import { Loading } from "@/components/ui/loading";
import { useTradeRequests } from "@/hooks/trade/useTradeRequests";
import { TradeModals } from "@/components/trade/TradeModals";
import { TradeTabs } from "@/components/trade/TradeTabs";
import { Footer } from "@/components/Footer";
export default function TradeRequests() {
  const {
    t
  } = useLanguage();
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
    openChat,
    refreshOpenTrades
  } = useTradeRequests();
  if (isLoading) {
    return <Loading />;
  }
  return <div className="pb-16 sm:pb-0 bg-white">
      <div className="container py-8 max-w-2xl">
        <h1 className="font-bold mb-6 text-gray-900 pb-2 border-b border-gray-200 text-base px-[21px] py-0 mx-0 text-left">トレード管理</h1>
        
        <TradeTabs tradeRequests={tradeRequests} acceptedTrades={acceptedTrades} completedTrades={completedTrades} openTrades={openTrades} handleTradeResponse={handleTradeResponse} openChat={openChat} refreshOpenTrades={refreshOpenTrades} />

        <TradeModals selectedRequest={selectedRequest} showCompletionModal={showCompletionModal} showChatModal={showChatModal} activeChatTradeId={activeChatTradeId} setShowCompletionModal={setShowCompletionModal} setSelectedRequest={setSelectedRequest} setShowChatModal={setShowChatModal} />
      </div>
      <Footer />
    </div>;
}