import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TradeCompletionModal } from "./TradeCompletionModal";
import { ChatModal } from "../chat/ChatModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingTradesList } from "./PendingTradesList";
import { AcceptedTradesList } from "./AcceptedTradesList";
import { CompletedTradesList } from "./CompletedTradesList";
import { TradeRequest } from "./types";

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
  const [completedTrades, setCompletedTrades] = useState<TradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchTradeRequests();
      fetchAcceptedTrades();
      fetchCompletedTrades();
    }
  }, [user, isOpen]);

  const fetchAcceptedTrades = async () => {
    if (!user) return;

    try {
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
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: "トレード情報の取得に失敗しました",
        });
        return;
      }

      setAcceptedTrades(data || []);
    } catch (error) {
      console.error("Error fetching accepted trades:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "トレード情報の取得に失敗しました",
      });
    }
  };

  const fetchCompletedTrades = async () => {
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
      .eq("status", "completed")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching completed trades:", error);
      return;
    }

    setCompletedTrades(data);
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
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>トレードリクエスト</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pending" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger 
                value="pending"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                保留中
              </TabsTrigger>
              <TabsTrigger 
                value="accepted"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                進行中
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                完了
              </TabsTrigger>
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
              <CompletedTradesList
                trades={completedTrades}
              />
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
