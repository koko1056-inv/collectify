
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingTradesList } from "./PendingTradesList";
import { AcceptedTradesList } from "./AcceptedTradesList";
import { CompletedTradesList } from "./CompletedTradesList";
import { OpenTradesList } from "./OpenTradesList";
import { TradeRequest } from "./types";

interface TradeTabsProps {
  tradeRequests: TradeRequest[];
  acceptedTrades: TradeRequest[];
  completedTrades: TradeRequest[];
  openTrades: TradeRequest[];
  handleTradeResponse: (tradeId: string, accept: boolean) => Promise<void>;
  openChat: (trade: TradeRequest) => void;
}

export function TradeTabs({
  tradeRequests,
  acceptedTrades,
  completedTrades,
  openTrades,
  handleTradeResponse,
  openChat
}: TradeTabsProps) {
  return (
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
  );
}
