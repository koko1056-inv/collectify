import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Inbox } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ChatModal } from "@/components/chat/ChatModal";
import { TradeReviewModal } from "@/features/trust/TradeReviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyTrades } from "@/hooks/trade/useMyTrades";

import { TradeCard } from "./TradeCard";
import { viewpointOf, type TradeRequest } from "./types";

interface TradeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 取引の一覧。
 *
 * 「申請」「進行中」「終わったもの」の3つに分ける。
 * 以前は同じクエリを3本書いて別々の state に入れていたので、
 * 片方だけ更新されて食い違うことがあった。いまは1本引いて仕分けるだけ。
 */
export function TradeRequestsModal({ isOpen, onClose }: TradeRequestsModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    isLoading,
    isError,
    refetch,
    incoming,
    outgoing,
    active,
    finished,
  } = useMyTrades(isOpen);

  // 読み込みが終わるまで届いている申請の件数が分からない。
  // defaultValue は初回レンダーで固定されてしまうので、
  // 自分で選ぶまではデータに合わせて開くタブを決める。
  const [pickedTab, setPickedTab] = useState<string | null>(null);
  const activeTab = pickedTab ?? (incoming.length > 0 ? "requests" : "active");

  const [chatTrade, setChatTrade] = useState<TradeRequest | null>(null);
  const [reviewTrade, setReviewTrade] = useState<TradeRequest | null>(null);

  const requests = useMemo(() => [...incoming, ...outgoing], [incoming, outgoing]);

  const reviewTarget = reviewTrade ? viewpointOf(reviewTrade, user?.id).partner : null;
  const chatPartner = chatTrade ? viewpointOf(chatTrade, user?.id).partner : null;

  const renderList = (trades: TradeRequest[], emptyTitle: string, emptyDesc?: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (isError) {
      return <QueryErrorState title={t("trade.list.loadFailed")} onRetry={() => refetch()} />;
    }
    if (trades.length === 0) {
      return (
        <EmptyState icon={ArrowLeftRight} title={emptyTitle} description={emptyDesc} className="py-10" />
      );
    }
    return (
      <div className="space-y-3">
        {trades.map((trade) => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onOpenChat={setChatTrade}
            onReview={setReviewTrade}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="flex h-[90vh] flex-col sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("trade.requestsModal.title")}</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setPickedTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requests" className="gap-1">
                <Inbox className="h-3.5 w-3.5" />
                {t("trade.tabs.pending")}
                {incoming.length > 0 && (
                  <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{incoming.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {t("trade.tabs.accepted")}
              </TabsTrigger>
              <TabsTrigger value="finished" className="gap-1">
                <Check className="h-3.5 w-3.5" />
                {t("trade.tabs.completed")}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="mt-3 min-h-0 flex-1 pr-3">
              <TabsContent value="requests" className="mt-0">
                {renderList(
                  requests,
                  t("trade.list.noRequests"),
                  t("trade.list.noRequestsDesc")
                )}
              </TabsContent>
              <TabsContent value="active" className="mt-0">
                {renderList(active, t("trade.list.noOngoing"), t("trade.list.noOngoingDesc"))}
              </TabsContent>
              <TabsContent value="finished" className="mt-0">
                {renderList(finished, t("trade.list.noFinished"))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {chatTrade && chatPartner && (
        <ChatModal
          isOpen={!!chatTrade}
          onClose={() => setChatTrade(null)}
          partnerId={chatPartner.id}
          tradeRequestId={chatTrade.id}
        />
      )}

      {reviewTrade && reviewTarget && (
        <TradeReviewModal
          isOpen={!!reviewTrade}
          onClose={() => setReviewTrade(null)}
          tradeRequestId={reviewTrade.id}
          revieweeId={reviewTarget.id}
          revieweeName={reviewTarget.display_name || reviewTarget.username}
        />
      )}
    </>
  );
}
