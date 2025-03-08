import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      username: string;
      display_name?: string | null;
    };
  };
}

export function TradeCompletionModal({
  isOpen,
  onClose,
  tradeRequest,
}: TradeCompletionModalProps) {
  const [step, setStep] = useState<'confirmation' | 'shipping' | 'complete'>('confirmation');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

      toast({
        title: "トレード完了",
        description: "トレードが完了しました。お疲れ様でした！",
      });
      onClose();
    } catch (error) {
      console.error("Error completing trade:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードの完了に失敗しました。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>トレード手続き</DialogTitle>
          <DialogDescription>
            {step === 'confirmation' && "トレードの詳細を確認してください"}
            {step === 'shipping' && "発送情報を入力してください"}
            {step === 'complete' && "トレードを完了します"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">提供アイテム</p>
                <img
                  src={tradeRequest.offered_item.image}
                  alt={tradeRequest.offered_item.title}
                  className="w-full aspect-square object-cover rounded-md"
                />
                <p className="mt-1 text-sm">{tradeRequest.offered_item.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">リクエストアイテム</p>
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
                <p className="text-sm font-medium">発送手続き</p>
                <p className="text-sm text-gray-500">
                  トレード相手と連絡を取り、発送方法や住所を確認してください。
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          {step === 'confirmation' && (
            <Button onClick={() => setStep('shipping')}>
              発送手続きへ進む
            </Button>
          )}
          {step === 'shipping' && (
            <Button onClick={() => setStep('complete')}>
              発送完了
            </Button>
          )}
          {step === 'complete' && (
            <Button 
              onClick={handleComplete}
              disabled={isLoading}
            >
              トレードを完了する
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
