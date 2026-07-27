
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradeRequest } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MyOpenTradeCardProps {
  trade: TradeRequest;
  onCancelSuccess: (tradeId: string) => void;
}

export function MyOpenTradeCard({ trade, onCancelSuccess }: MyOpenTradeCardProps) {
  const { t } = useLanguage();

  const handleCancelTrade = async () => {
    try {
      const { error } = await supabase
        .from("trade_requests")
        .delete()
        .eq("id", trade.id)
        .eq("sender_id", trade.sender.id);
      
      if (error) throw error;
      
      onCancelSuccess(trade.id);
      
      toast.success(t("trade.myOpen.cancelledTitle"), {
        description: t("trade.myOpen.cancelledDesc"),
      });
    } catch (error) {
      console.error("Error cancelling trade:", error);
      toast.error(t("common.error"), {
        description: t("trade.myOpen.cancelErrorDesc"),
      });
    }
  };

  return (
    <Card className="overflow-hidden border border-border hover:border-border transition-colors rounded-xl shadow-sm hover:shadow-md animate-fade-in">
      <CardHeader className="p-4 pb-0 bg-muted">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
          {t("trade.myOpen.cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("trade.myOpen.offeredItem")}</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-muted transition-colors group border-border">
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
            <p className="text-sm font-medium text-foreground">{t("trade.myOpen.desiredItem")}</p>
            <div className="border rounded-lg p-2 flex items-center space-x-2 hover:bg-muted transition-colors group border-border">
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
          <div className="mt-4 p-3 bg-muted rounded-lg border-l-4 border-border">
            <p className="text-sm text-foreground italic">{trade.message}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted p-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancelTrade}
          className="rounded-full border-border text-muted-foreground hover:bg-muted"
        >
          <X className="mr-1 h-4 w-4" />
          {t("common.cancel")}
        </Button>
      </CardFooter>
    </Card>
  );
}
