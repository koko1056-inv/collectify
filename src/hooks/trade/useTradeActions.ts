
import { useToast } from "@/hooks/use-toast";
import { TradeRequest } from "@/components/trade/types";
import { updateTradeRequestStatus, createTradeMessages } from "@/services/trade/tradeService";
import { useLanguage } from "@/contexts/LanguageContext";

type TradeStateProps = {
  setShowCompletionModal: (show: boolean) => void;
  setSelectedRequest: (request: TradeRequest | null) => void;
  setActiveChatTradeId: (id: string | null) => void;
  setShowChatModal: (show: boolean) => void;
};

export function useTradeActions({
  setShowCompletionModal,
  setSelectedRequest,
  setActiveChatTradeId,
  setShowChatModal
}: TradeStateProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const openChat = (trade: TradeRequest) => {
    setSelectedRequest(trade);
    setActiveChatTradeId(trade.id);
    setShowChatModal(true);
  };
  
  return {
    openChat,

    handleTradeResponse: async (
      trade: TradeRequest,
      userId: string,
      accept: boolean,
      onComplete: () => Promise<void>
    ) => {
      // Update the trade request status
      const success = await updateTradeRequestStatus(
        trade.id, 
        accept ? "accepted" : "rejected"
      );

      if (!success) {
        toast({
          variant: "destructive",
          title: t("notices.common.errorTitle"),
          description: t("notices.trade.updateFailed"),
        });
        return;
      }

      // Handle accepted trade
      if (accept) {
        setSelectedRequest(trade);
        setShowCompletionModal(true);

        // Create trade messages
        await createTradeMessages(
          trade.id,
          trade.sender.id,
          userId,
          trade.offered_item.title,
          trade.requested_item.title
        );
        
        setActiveChatTradeId(trade.id);
        setShowChatModal(true);
      } else {
        toast({
          title: t("notices.trade.updateDoneTitle"),
          description: t("notices.trade.rejected"),
        });
      }

      // Refresh trades after operation
      await onComplete();
    }
  };
}
