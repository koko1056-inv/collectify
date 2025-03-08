
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw } from "lucide-react";
import { useMyOpenTrades } from "@/hooks/trade/useMyOpenTrades";
import { MyOpenTradeCard } from "./MyOpenTradeCard";

export function OpenTradeRequests() {
  const { isLoading, tradeRequests, fetchMyOpenTradeRequests, handleCancelSuccess } = useMyOpenTrades();

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
              <MyOpenTradeCard 
                key={trade.id} 
                trade={trade}
                onCancelSuccess={handleCancelSuccess}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
