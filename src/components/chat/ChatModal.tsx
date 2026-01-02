import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useChat } from "./useChat";
import { ChatStep } from "./ChatStep";
import { ShippingStep } from "./ShippingStep";
import { CompleteStep } from "./CompleteStep";
import { ShippingConfirmDialog } from "./ShippingConfirmDialog";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerProfile } from "./types";

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
        <DialogContent className="sm:max-w-[480px] h-[85vh] max-h-[700px] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden [&>button:last-child]:hidden">
          <VisuallyHidden.Root>
            <DialogTitle>チャット</DialogTitle>
          </VisuallyHidden.Root>
          {/* カスタムヘッダー */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={partnerProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {partnerProfile?.display_name?.[0] || partnerProfile?.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {partnerProfile?.display_name || partnerProfile?.username || "ユーザー"}
              </h3>
              <p className="text-xs text-muted-foreground">
                @{partnerProfile?.username || "unknown"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* チャットコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
            {step === 'chat' && (
              <ChatStep 
                messages={messages}
                onSendMessage={sendMessage}
                onProceedToShipping={proceedToShipping}
                showShippingButton={!!tradeRequestId}
                partnerProfile={partnerProfile}
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
          </div>
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
