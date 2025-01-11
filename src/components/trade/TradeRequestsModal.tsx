import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TradeRequest {
  id: string;
  sender: {
    username: string;
    display_name: string | null;
  };
  offered_item: {
    title: string;
    image: string;
  };
  requested_item: {
    title: string;
    image: string;
  };
  message: string | null;
  status: string;
}

interface TradeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TradeRequestsModal({ isOpen, onClose }: TradeRequestsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);

  useEffect(() => {
    if (user && isOpen) {
      fetchTradeRequests();
    }
  }, [user, isOpen]);

  const fetchTradeRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(username, display_name),
        offered_item:user_items!trade_requests_offered_item_id_fkey(title, image),
        requested_item:user_items!trade_requests_requested_item_id_fkey(title, image)
      `)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching trade requests:", error);
      return;
    }

    setTradeRequests(data as TradeRequest[]);
  };

  const handleTradeResponse = async (tradeId: string, accept: boolean) => {
    const { error } = await supabase
      .from("trade_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", tradeId);

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "トレードリクエストの更新に失敗しました",
      });
      return;
    }

    toast({
      title: "更新完了",
      description: accept ? "トレードリクエストを承認しました" : "トレードリクエストを拒否しました",
    });

    fetchTradeRequests();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh]">
        <DialogHeader>
          <DialogTitle>受信したトレードリクエスト</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 pr-4">
            {tradeRequests.length === 0 ? (
              <p className="text-center text-gray-500">現在、受信したトレードリクエストはありません</p>
            ) : (
              tradeRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {request.sender.display_name || request.sender.username}
                    </span>
                    <span className="text-sm text-gray-500">からのリクエスト</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">提供アイテム:</p>
                      <img
                        src={request.offered_item.image}
                        alt={request.offered_item.title}
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      <p className="text-sm truncate">{request.offered_item.title}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">リクエストアイテム:</p>
                      <img
                        src={request.requested_item.image}
                        alt={request.requested_item.title}
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      <p className="text-sm truncate">{request.requested_item.title}</p>
                    </div>
                  </div>
                  {request.message && (
                    <div className="text-sm bg-gray-50 rounded p-2">
                      {request.message}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleTradeResponse(request.id, false)}
                    >
                      拒否
                    </Button>
                    <Button
                      onClick={() => handleTradeResponse(request.id, true)}
                    >
                      承認
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}