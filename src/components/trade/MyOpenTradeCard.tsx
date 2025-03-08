
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MyOpenTradeCardProps {
  trade: TradeRequest;
  onCancelSuccess: (tradeId: string) => void;
}

export function MyOpenTradeCard({ trade, onCancelSuccess }: MyOpenTradeCardProps) {
  const { toast } = useToast();

  const handleCancelTrade = async () => {
    try {
      const { error } = await supabase
        .from("trade_requests")
        .delete()
        .eq("id", trade.id)
        .eq("sender_id", trade.sender.id);
      
      if (error) throw error;
      
      onCancelSuccess(trade.id);
      
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

  return (
    <Card className="overflow-hidden">
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
          onClick={handleCancelTrade}
        >
          キャンセル
        </Button>
      </CardFooter>
    </Card>
  );
}
