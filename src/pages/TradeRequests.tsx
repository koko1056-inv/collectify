
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { TradeCompletionModal } from "@/components/trade/TradeCompletionModal";
import { ChatModal } from "@/components/chat/ChatModal";
import { PendingTradesList } from "@/components/trade/PendingTradesList";
import { AcceptedTradesList } from "@/components/trade/AcceptedTradesList";
import { CompletedTradesList } from "@/components/trade/CompletedTradesList";
import { OpenTradesList } from "@/components/trade/OpenTradesList";
import { TradeRequest } from "@/components/trade/types";
import { Loader2 } from "lucide-react";

// Create an interface for the check_column_exists RPC function return
interface ColumnCheckResult {
  check_column_exists: boolean;
}

export default function TradeRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const [acceptedTrades, setAcceptedTrades] = useState<TradeRequest[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeRequest[]>([]);
  const [openTrades, setOpenTrades] = useState<TradeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchTradeRequests(),
        fetchAcceptedTrades(),
        fetchCompletedTrades(),
        fetchOpenTrades()
      ]).finally(() => setIsLoading(false));
    }
  }, [user]);

  const fetchTradeRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        shipping_status,
        sender:profiles!trade_requests_sender_id_fkey(
          id,
          username,
          display_name
        ),
        receiver:profiles!trade_requests_receiver_id_fkey(
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

    setTradeRequests(data as TradeRequest[]);
  };

  const fetchAcceptedTrades = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        shipping_status,
        sender:profiles!trade_requests_sender_id_fkey(
          id,
          username,
          display_name
        ),
        receiver:profiles!trade_requests_receiver_id_fkey(
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

    setAcceptedTrades(data as TradeRequest[]);
  };

  const fetchCompletedTrades = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`
        id,
        message,
        status,
        shipping_status,
        sender:profiles!trade_requests_sender_id_fkey(
          id,
          username,
          display_name
        ),
        receiver:profiles!trade_requests_receiver_id_fkey(
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

    setCompletedTrades(data as TradeRequest[]);
  };

  const fetchOpenTrades = async () => {
    if (!user) return;
    
    try {
      // Check if is_open column exists in the trade_requests table
      const { data, error: rpcError } = await supabase
        .rpc<ColumnCheckResult>('check_column_exists', { 
          table_name: 'trade_requests',
          column_name: 'is_open'
        });
      
      if (rpcError) {
        console.error("Error checking column existence:", rpcError);
        setOpenTrades([]);
        return;
      }
      
      const isColumnExist = data?.check_column_exists || false;
      
      if (!isColumnExist) {
        console.log("is_open column does not exist in trade_requests table");
        setOpenTrades([]);
        return;
      }
      
      const { data: tradesData, error: queryError } = await supabase
        .from("trade_requests")
        .select(`
          id,
          message,
          status,
          shipping_status,
          is_open,
          sender:profiles!trade_requests_sender_id_fkey(
            id,
            username,
            display_name
          ),
          receiver:profiles!trade_requests_receiver_id_fkey(
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
        .eq("is_open", true)
        .eq("status", "pending")
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        console.error("Error fetching open trades:", queryError);
        setOpenTrades([]);
        return;
      }

      // Use type assertion to ensure type safety
      const typedTradesData = (tradesData || []) as unknown as TradeRequest[];
      setOpenTrades(typedTradesData);
    } catch (error) {
      console.error("Error in fetchOpenTrades:", error);
      setOpenTrades([]);
    }
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

    const request = tradeRequests.find(req => req.id === tradeId) || 
                    openTrades.find(req => req.id === tradeId);
                    
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
    fetchOpenTrades();
  };

  const openChat = (trade: TradeRequest) => {
    setSelectedRequest(trade);
    setActiveChatTradeId(trade.id);
    setShowChatModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">トレード管理</h1>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
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
          <TabsTrigger 
            value="open"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            オープン
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-0">
          <PendingTradesList
            trades={tradeRequests}
            onAccept={(id) => handleTradeResponse(id, true)}
            onReject={(id) => handleTradeResponse(id, false)}
          />
        </TabsContent>
        
        <TabsContent value="accepted" className="mt-0">
          <AcceptedTradesList
            trades={acceptedTrades}
            onOpenChat={openChat}
          />
        </TabsContent>
        
        <TabsContent value="completed" className="mt-0">
          <CompletedTradesList
            trades={completedTrades}
          />
        </TabsContent>
        
        <TabsContent value="open" className="mt-0">
          <OpenTradesList
            trades={openTrades}
            onAccept={(id) => handleTradeResponse(id, true)}
            onReject={(id) => handleTradeResponse(id, false)}
          />
        </TabsContent>
      </Tabs>

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

      {activeChatTradeId && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          partnerId={selectedRequest?.sender.id || ''}
          tradeRequestId={activeChatTradeId}
        />
      )}
    </div>
  );
}
