import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TradeCompletionModal } from "./TradeCompletionModal";
import { ChatModal } from "../chat/ChatModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TradeRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    display_name: string | null;
  };
  offered_item: {
    id: string;
    title: string;
    image: string;
  };
  requested_item: {
    id: string;
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
  const [acceptedTrades, setAcceptedTrades] = useState<TradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchTradeRequests();
      fetchAcceptedTrades();
    }
  }, [user, isOpen]);

  const fetchAcceptedTrades = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(
          id,
          username,
          display_name
        ),
        offered_item:user_items!trade_requests_offered_item_id_fkey(
          id,
          title,
          image
        ),
        requested_item:user_items!trade_requests_requested_item_id_fkey(
          id,
          title,
          image
        )
      `)
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching accepted trades:", error);
      return;
    }

    setAcceptedTrades(data);
  };

  const fetchTradeRequests = async () => {
    if (!user) return;

    const { data: tradeRequestsData, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        sender:profiles!trade_requests_sender_id_fkey(
          id,
          username,
          display_name
        ),
        offered_item:user_items!trade_requests_offered_item_id_fkey(
          id,
          title,
          image
        ),
        requested_item:user_items!trade_requests_requested_item_id_fkey(
          id,
          title,
          image
        )
      `)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching trade requests:", error);
      return;
    }

    setTradeRequests(tradeRequestsData);
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

    const request = tradeRequests.find(req => req.id === tradeId);
    if (request) {
      if (accept) {
        setSelectedRequest(request);
        setShowCompletionModal(true);

        // Create a new chat message for the trade
        const { error: messageError } = await supabase
          .from("messages")
          .insert([
            {
              sender_id: user?.id,
              receiver_id: request.sender.id,
              content: `トレードが承認されました。「${request.offered_item.title}」と「${request.requested_item.title}」の交換について詳細を決めましょう。`,
              trade_request_id: tradeId
            },
            {
              sender_id: request.sender.id,
              receiver_id: user?.id,
              content: `あなたのトレードリクエストが承認されました。「${request.offered_item.title}」と「${request.requested_item.title}」の交換を進めましょう。`,
              trade_request_id: tradeId
            }
          ]);

        if (messageError) {
          console.error("Error creating trade messages:", messageError);
        }

        setActiveChatTradeId(tradeId);
        setShowChatModal(true);
      } else {
        toast({
          title: "更新完了",
          description: "トレードリクエストを拒否しました",
        });
      }
    }

    fetchTradeRequests();
  };

  const openChat = (trade: TradeRequest) => {
    setSelectedRequest(trade);
    setActiveChatTradeId(trade.id);
    setShowChatModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh]">
          <DialogHeader>
            <DialogTitle>トレードリクエスト</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">保留中</TabsTrigger>
              <TabsTrigger value="accepted">進行中</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
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
            </TabsContent>
            <TabsContent value="accepted">
              <ScrollArea className="flex-1 px-1">
                <div className="space-y-4 pr-4">
                  {acceptedTrades.length === 0 ? (
                    <p className="text-center text-gray-500">現在、進行中のトレードはありません</p>
                  ) : (
                    acceptedTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {trade.sender.display_name || trade.sender.username}
                          </span>
                          <span className="text-sm text-gray-500">とのトレード</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">提供アイテム:</p>
                            <img
                              src={trade.offered_item.image}
                              alt={trade.offered_item.title}
                              className="w-full aspect-square object-cover rounded-md"
                            />
                            <p className="text-sm truncate">{trade.offered_item.title}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">リクエストアイテム:</p>
                            <img
                              src={trade.requested_item.image}
                              alt={trade.requested_item.title}
                              className="w-full aspect-square object-cover rounded-md"
                            />
                            <p className="text-sm truncate">{trade.requested_item.title}</p>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => openChat(trade)}
                        >
                          チャットを開く
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selectedRequest && (
        <TradeCompletionModal
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedRequest(null);
            onClose();
          }}
          tradeRequest={selectedRequest}
        />
      )}

      {activeChatTradeId && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          partnerId={selectedRequest?.sender.id || ''}
          tradeRequestId={activeChatTradeId}
        />
      )}
    </>
  );
}
