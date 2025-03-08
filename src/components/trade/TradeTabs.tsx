
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingTradesList } from "./PendingTradesList";
import { AcceptedTradesList } from "./AcceptedTradesList";
import { CompletedTradesList } from "./CompletedTradesList";
import { OpenTradesList } from "./OpenTradesList";
import { TradeRequest } from "./types";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TradeTabsProps {
  tradeRequests: TradeRequest[];
  acceptedTrades: TradeRequest[];
  completedTrades: TradeRequest[];
  openTrades: TradeRequest[];
  handleTradeResponse: (tradeId: string, accept: boolean) => Promise<void>;
  openChat: (trade: TradeRequest) => void;
  refreshOpenTrades?: () => void;
}

export function TradeTabs({
  tradeRequests,
  acceptedTrades,
  completedTrades,
  openTrades,
  handleTradeResponse,
  openChat,
  refreshOpenTrades
}: TradeTabsProps) {
  const [showTradeTabs, setShowTradeTabs] = useState(true);
  const [showOpenTrades, setShowOpenTrades] = useState(false);

  const toggleView = () => {
    setShowTradeTabs(!showTradeTabs);
    setShowOpenTrades(!showOpenTrades);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button 
          variant={showTradeTabs ? "default" : "outline"} 
          onClick={() => {
            setShowTradeTabs(true);
            setShowOpenTrades(false);
          }}
          className="flex-1 rounded-r-none"
        >
          マイトレード
        </Button>
        <Button 
          variant={showOpenTrades ? "default" : "outline"}
          onClick={() => {
            setShowTradeTabs(false);
            setShowOpenTrades(true);
          }}
          className="flex-1 rounded-l-none"
        >
          オープントレード
        </Button>
      </div>

      {showTradeTabs && (
        <Tabs defaultValue="pending" className="w-full">
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
        </Tabs>
      )}
      
      {showOpenTrades && (
        <div className="mt-4">
          <OpenTradesList
            trades={openTrades}
            onAccept={(id) => handleTradeResponse(id, true)}
            onReject={(id) => handleTradeResponse(id, false)}
            onRefresh={refreshOpenTrades}
          />
        </div>
      )}
    </div>
  );
}
