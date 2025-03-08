
import { useToast } from "@/hooks/use-toast";
import { TradeRequest } from "@/components/trade/types";
import { updateTradeRequestStatus, createTradeMessages } from "@/services/trade/tradeService";

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
          title: "エラー",
          description: "トレードリクエストの更新に失敗しました",
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
          title: "更新完了",
          description: "トレードリクエストを拒否しました",
        });
      }

      // Refresh trades after operation
      await onComplete();
    }
  };
}
