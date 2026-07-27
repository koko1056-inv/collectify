
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TradeReviewModal } from "@/features/trust/TradeReviewModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface TradeCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeRequest: {
    id: string;
    offered_item: {
      title: string;
      image: string;
    };
    requested_item: {
      title: string;
      image: string;
    };
    sender: {
      id?: string;
      username: string;
      display_name?: string | null;
    };
    receiver?: {
      id?: string;
      username: string;
      display_name?: string | null;
    } | null;
  };
}

export function TradeCompletionModal({
  isOpen,
  onClose,
  tradeRequest,
}: TradeCompletionModalProps) {
  const [step, setStep] = useState<'confirmation' | 'shipping' | 'complete'>('confirmation');
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // 相手のIDと表示名を判定
  const counterparty = (() => {
    if (!user) return null;
    if (tradeRequest.sender?.id === user.id) {
      return tradeRequest.receiver
        ? { id: tradeRequest.receiver.id, name: tradeRequest.receiver.display_name || tradeRequest.receiver.username }
        : null;
    }
    return tradeRequest.sender?.id
      ? { id: tradeRequest.sender.id, name: tradeRequest.sender.display_name || tradeRequest.sender.username }
      : null;
  })();

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("trade_requests")
        .update({ status: "completed" })
        .eq("id", tradeRequest.id);

      if (error) {
        throw error;
      }

      toast.success(t("trade.list.completedToastTitle"), {
        description: t("trade.list.completedToastDesc"),
      });

      // 相手がいれば評価モーダルを表示
      if (counterparty?.id) {
        setShowReview(true);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error completing trade:", error);
      toast.error(t("common.error"), {
        description: t("trade.list.completeErrorDesc"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showReview} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] bg-popover">
          <DialogHeader>
            <DialogTitle>{t("trade.completion.title")}</DialogTitle>
            <DialogDescription>
              {step === 'confirmation' && t("trade.completion.descConfirmation")}
              {step === 'shipping' && t("trade.completion.descShipping")}
              {step === 'complete' && t("trade.completion.descComplete")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("trade.completion.offeredItem")}</p>
                  <img
                    src={tradeRequest.offered_item.image}
                    alt={tradeRequest.offered_item.title}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                  <p className="mt-1 text-sm">{tradeRequest.offered_item.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("trade.completion.requestedItem")}</p>
                  <img
                    src={tradeRequest.requested_item.image}
                    alt={tradeRequest.requested_item.title}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                  <p className="mt-1 text-sm">{tradeRequest.requested_item.title}</p>
                </div>
              </div>

              {step === 'shipping' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("trade.completion.shippingHeading")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("trade.completion.shippingHelp")}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            {step === 'confirmation' && (
              <Button onClick={() => setStep('shipping')} className="bg-foreground text-background hover:bg-foreground/90">
                {t("trade.completion.toShipping")}
              </Button>
            )}
            {step === 'shipping' && (
              <Button onClick={() => setStep('complete')} className="bg-foreground text-background hover:bg-foreground/90">
                {t("trade.completion.shipped")}
              </Button>
            )}
            {step === 'complete' && (
              <Button 
                onClick={handleComplete}
                disabled={isLoading}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {t("trade.completion.complete")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {counterparty?.id && (
        <TradeReviewModal
          isOpen={showReview}
          onClose={() => {
            setShowReview(false);
            onClose();
          }}
          tradeRequestId={tradeRequest.id}
          revieweeId={counterparty.id}
          revieweeName={counterparty.name}
        />
      )}
    </>
  );
}
