
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChat } from "./useChat";
import { ChatStep } from "./ChatStep";
import { ShippingStep } from "./ShippingStep";
import { CompleteStep } from "./CompleteStep";
import { ShippingConfirmDialog } from "./ShippingConfirmDialog";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  tradeRequestId?: string;
}

export function ChatModal({ isOpen, onClose, partnerId, tradeRequestId }: ChatModalProps) {
  const { user } = useAuth();
  const {
    messages,
    partnerProfile,
    step,
    isCompleting,
    isShippingConfirmOpen,
    setIsShippingConfirmOpen,
    sendMessage,
    proceedToShipping,
    completeShipping,
    completeTrade
  } = useChat({ partnerId, tradeRequestId, isOpen });

  // モーダルが開いたときに既読にする
  useEffect(() => {
    if (isOpen && user) {
      markMessagesAsRead();
    }
  }, [isOpen, user, partnerId, tradeRequestId]);

  // メッセージを既読にする関数
  const markMessagesAsRead = async () => {
    if (!user) return;

    let query = supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (tradeRequestId) {
      query = query.eq("trade_request_id", tradeRequestId);
    } else {
      query = query.eq("sender_id", partnerId);
    }

    await query;
  };

  const handleComplete = async () => {
    await completeTrade();
    onClose();
  };

  const handleClose = () => {
    // 閉じるときに既読にする
    markMessagesAsRead();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {partnerProfile ? 
                `${partnerProfile.display_name || partnerProfile.username}とのチャット` : 
                "チャット"}
            </DialogTitle>
          </DialogHeader>
          
          {step === 'chat' && (
            <ChatStep 
              messages={messages}
              onSendMessage={sendMessage}
              onProceedToShipping={proceedToShipping}
              showShippingButton={!!tradeRequestId}
            />
          )}

          {step === 'shipping' && (
            <ShippingStep 
              onShippingComplete={() => setIsShippingConfirmOpen(true)} 
            />
          )}

          {step === 'complete' && (
            <CompleteStep 
              onComplete={handleComplete}
              isCompleting={isCompleting}
            />
          )}
        </DialogContent>
      </Dialog>

      <ShippingConfirmDialog 
        isOpen={isShippingConfirmOpen}
        onOpenChange={setIsShippingConfirmOpen}
        onConfirm={completeShipping}
      />
    </>
  );
}
