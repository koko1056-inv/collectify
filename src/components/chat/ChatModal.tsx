
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChat } from "./useChat";
import { ChatStep } from "./ChatStep";
import { ShippingStep } from "./ShippingStep";
import { CompleteStep } from "./CompleteStep";
import { ShippingConfirmDialog } from "./ShippingConfirmDialog";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  tradeRequestId?: string;
}

export function ChatModal({ isOpen, onClose, partnerId, tradeRequestId }: ChatModalProps) {
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

  const handleComplete = async () => {
    await completeTrade();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
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
