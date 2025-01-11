import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { TradeCompletionModal } from "./TradeCompletionModal";
import { ChatModal } from "../chat/ChatModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingTradesList } from "./PendingTradesList";
import { AcceptedTradesList } from "./AcceptedTradesList";
import { CompletedTradesList } from "./CompletedTradesList";
import { TradeRequest } from "./types";
import { useTradeRequests } from "@/hooks/trade/useTradeRequests";

interface TradeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TradeRequestsModal({ isOpen, onClose }: TradeRequestsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tradeRequests, acceptedTrades, completedTrades, fetchAllTrades } = useTradeRequests();
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);

  const handleTradeResponse = async (tradeId: string, accept: boolean) => {
    const { error } = await supabase
      .from("trade_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", tradeId);

    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "トレードリクエストの更新に失敗しました",
      });
      return;
    }

    const request = tradeRequests.find(req => req.id === tradeId);
    if (request) {
      if (accept) {
        setSelectedRequest(request);
        setShowCompletionModal(true);

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

    fetchAllTrades();
  };

  const openChat = (trade: TradeRequest) => {
    setSelectedRequest(trade);
    setActiveChatTradeId(trade.id);
    setShowChatModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>トレードリクエスト</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pending" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pending">保留中</TabsTrigger>
              <TabsTrigger value="accepted">進行中</TabsTrigger>
              <TabsTrigger value="completed">完了</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="flex-1 mt-0">
              <PendingTradesList
                trades={tradeRequests}
                onAccept={(id) => handleTradeResponse(id, true)}
                onReject={(id) => handleTradeResponse(id, false)}
              />
            </TabsContent>
            <TabsContent value="accepted" className="flex-1 mt-0">
              <AcceptedTradesList
                trades={acceptedTrades}
                onOpenChat={openChat}
              />
            </TabsContent>
            <TabsContent value="completed" className="flex-1 mt-0">
              <CompletedTradesList trades={completedTrades} />
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