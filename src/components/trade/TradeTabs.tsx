
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingTradesList } from "./PendingTradesList";
import { AcceptedTradesList } from "./AcceptedTradesList";
import { CompletedTradesList } from "./CompletedTradesList";
import { OpenTradesList } from "./OpenTradesList";
import { TradeRequest } from "./types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Gift, Send, Inbox, ArrowLeftRight } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button 
          variant={showTradeTabs ? "default" : "outline"} 
          onClick={() => {
            setShowTradeTabs(true);
            setShowOpenTrades(false);
          }}
          className={`flex-1 rounded-r-none ${showTradeTabs ? "bg-black text-white" : "text-gray-600"}`}
        >
          <Inbox className="mr-2 h-4 w-4" />
          マイトレード
        </Button>
        <Button 
          variant={showOpenTrades ? "default" : "outline"}
          onClick={() => {
            setShowTradeTabs(false);
            setShowOpenTrades(true);
          }}
          className={`flex-1 rounded-l-none ${showOpenTrades ? "bg-black text-white" : "text-gray-600"}`}
        >
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          オープントレード
        </Button>
      </div>

      {showTradeTabs && (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger 
              value="pending"
              className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg"
            >
              <div className="flex items-center space-x-1">
                <Inbox className="h-4 w-4" />
                <span>保留中</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="accepted"
              className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg"
            >
              <div className="flex items-center space-x-1">
                <Gift className="h-4 w-4" />
                <span>進行中</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-black data-[state=active]:text-white rounded-lg"
            >
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>完了</span>
              </div>
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
        <div className="mt-4 animate-fade-in">
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
