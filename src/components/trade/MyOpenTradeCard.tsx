
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowLeftRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MyOpenTradeCardProps {
  trade: TradeRequest;
  onCancelSuccess: (tradeId: string) => void;
}

export function MyOpenTradeCard({ trade, onCancelSuccess }: MyOpenTradeCardProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    <Card className={`overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors rounded-xl shadow-sm hover:shadow-md animate-fade-in ${isMobile ? 'max-w-[300px] mx-auto' : ''}`}>
      <CardHeader className={`${isMobile ? 'p-2 pb-0' : 'p-3 pb-0'} bg-gray-50`}>
        <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-1 text-gray-800`}>
          <ArrowLeftRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-gray-500`} />
          オープントレード
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-2 pt-1' : 'p-3 pt-2'}`}>
        <div className={`space-y-${isMobile ? '2' : '3'} mt-1`}>
          <div className="space-y-1">
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>提供アイテム</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-gray-50 transition-colors group border-gray-200">
              <div className={`relative ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} overflow-hidden rounded-lg flex-shrink-0`}>
                <img 
                  src={trade.offered_item.image} 
                  alt={trade.offered_item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} truncate flex-1 max-w-[150px]`}>{trade.offered_item.title}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>希望アイテム</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-gray-50 transition-colors group border-gray-200">
              <div className={`relative ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} overflow-hidden rounded-lg flex-shrink-0`}>
                <img 
                  src={trade.requested_item.image} 
                  alt={trade.requested_item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} truncate flex-1 max-w-[150px]`}>{trade.requested_item.title}</span>
            </div>
          </div>
        </div>
        
        {trade.message && (
          <div className={`${isMobile ? 'mt-2 p-1.5' : 'mt-3 p-2'} bg-gray-50 rounded-lg border-l-4 border-gray-300`}>
            <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-700 italic line-clamp-2`}>{trade.message}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className={`bg-gray-50 ${isMobile ? 'p-1.5' : 'p-2'} flex justify-end`}>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancelTrade}
          className={`rounded-full border-gray-200 text-gray-600 hover:bg-gray-100 ${isMobile ? 'text-xs py-0.5 px-2 h-6' : 'text-xs py-1'}`}
        >
          <X className={`mr-1 ${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
          {isMobile ? '削除' : 'キャンセル'}
        </Button>
      </CardFooter>
    </Card>
  );
}
