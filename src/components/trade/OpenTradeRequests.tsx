import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { TradeRequest } from "./types";
import { useToast } from "@/hooks/use-toast";

export function OpenTradeRequests() {
  const [isLoading, setIsLoading] = useState(true);
  const [tradeRequests, setTradeRequests] = useState<TradeRequest[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMyOpenTradeRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
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
        .eq("sender_id", user.id)
        .eq("is_open", true);

      if (error) throw error;
      setTradeRequests(data as unknown as TradeRequest[]);
    } catch (error) {
      console.error("Error fetching trade requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from("trade_requests")
        .delete()
        .eq("id", tradeId)
        .eq("sender_id", user?.id);
      
      if (error) throw error;
      
      setTradeRequests(tradeRequests.filter(trade => trade.id !== tradeId));
      
      toast({
        title: "トレードをキャンセルしました",
        description: "オープントレードが削除されました",
      });
    } catch (error) {
      console.error("Error cancelling trade:", error);
      toast({
        title: "エラー",
        description: "トレードのキャンセルに失敗しました",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMyOpenTradeRequests();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">トレードリクエスト一覧</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchMyOpenTradeRequests}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          更新
        </Button>
      </div>
      
      {tradeRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">まだオープントレードリクエストはありません</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[350px] pr-2">
          <div className="space-y-4 pb-2">
            {tradeRequests.map((trade) => (
              <Card key={trade.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-lg">オープントレードリクエスト</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">提供アイテム</p>
                      <div className="border rounded-md p-2 flex items-center space-x-2">
                        <img 
                          src={trade.offered_item.image} 
                          alt={trade.offered_item.title} 
                          className="w-12 h-12 object-cover rounded"
                        />
                        <span className="text-sm truncate">{trade.offered_item.title}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">希望アイテム</p>
                      <div className="border rounded-md p-2 flex items-center space-x-2">
                        <img 
                          src={trade.requested_item.image} 
                          alt={trade.requested_item.title} 
                          className="w-12 h-12 object-cover rounded"
                        />
                        <span className="text-sm truncate">{trade.requested_item.title}</span>
                      </div>
                    </div>
                  </div>
                  
                  {trade.message && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{trade.message}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-gray-50 p-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCancelTrade(trade.id)}
                  >
                    キャンセル
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
