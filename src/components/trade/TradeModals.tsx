
import { TradeCompletionModal } from "./TradeCompletionModal";
import { ChatModal } from "../chat/ChatModal";
import { TradeRequest } from "./types";

interface TradeModalsProps {
  selectedRequest: TradeRequest | null;
  showCompletionModal: boolean;
  showChatModal: boolean;
  activeChatTradeId: string | null;
  setShowCompletionModal: (show: boolean) => void;
  setSelectedRequest: (request: TradeRequest | null) => void;
  setShowChatModal: (show: boolean) => void;
}

export function TradeModals({
  selectedRequest,
  showCompletionModal,
  showChatModal,
  activeChatTradeId,
  setShowCompletionModal,
  setSelectedRequest,
  setShowChatModal,
}: TradeModalsProps) {
  return (
    <>
      {selectedRequest && (
        <TradeCompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedRequest(null);
          }}
          tradeRequest={selectedRequest}
        />
      )}

      {activeChatTradeId && selectedRequest && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          partnerId={selectedRequest.sender.id === selectedRequest.receiver?.id ? selectedRequest.receiver.id : selectedRequest.sender.id}
          tradeRequestId={activeChatTradeId}
        />
      )}
    </>
  );
}
