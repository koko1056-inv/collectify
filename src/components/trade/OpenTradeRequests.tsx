
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyOpenTrades } from "@/hooks/trade/useMyOpenTrades";
import { MyOpenTradeCard } from "./MyOpenTradeCard";
import { useLanguage } from "@/contexts/LanguageContext";

export function OpenTradeRequests() {
  const { isLoading, tradeRequests, fetchMyOpenTradeRequests, handleCancelSuccess } = useMyOpenTrades();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }

  return (
    <div className="mt-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-primary">{t("trade.myOpen.heading")}</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchMyOpenTradeRequests}
          className="flex items-center gap-1 rounded-full hover:bg-primary/5 border-primary/20 text-primary"
        >
          <RefreshCw className="h-4 w-4" />
          {t("trade.myOpen.refresh")}
        </Button>
      </div>
      
      {tradeRequests.length === 0 ? (
        <Card className="border-dashed border-2 border-border bg-muted">
          <CardContent className="p-0">
            <EmptyState
              title={t("trade.myOpen.empty")}
              action={
                <span className="inline-block bg-primary/10 text-primary text-xs px-3 py-1 rounded-full">
                  {t("trade.myOpen.createPrompt")}
                </span>
              }
            />
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
