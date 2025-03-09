
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowLeftRight } from "lucide-react";

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
    <Card className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors rounded-xl shadow-sm hover:shadow-md animate-fade-in">
      <CardHeader className="p-4 pb-0 bg-gray-50">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
          <ArrowLeftRight className="h-5 w-5 text-gray-500" />
          オープントレードリクエスト
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">提供アイテム</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-gray-50 transition-colors group border-gray-200">
              <div className="relative w-12 h-12 overflow-hidden rounded-lg">
                <img 
                  src={trade.offered_item.image} 
                  alt={trade.offered_item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-sm truncate">{trade.offered_item.title}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">希望アイテム</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-gray-50 transition-colors group border-gray-200">
              <div className="relative w-12 h-12 overflow-hidden rounded-lg">
                <img 
                  src={trade.requested_item.image} 
                  alt={trade.requested_item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-sm truncate">{trade.requested_item.title}</span>
            </div>
          </div>
        </div>
        
        {trade.message && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
            <p className="text-sm text-gray-700 italic">{trade.message}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 p-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancelTrade}
          className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-100"
        >
          <X className="mr-1 h-4 w-4" />
          キャンセル
        </Button>
      </CardFooter>
    </Card>
  );
}
