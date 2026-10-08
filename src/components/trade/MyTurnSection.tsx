import { useState } from "react";
import { BellRing } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatModal } from "@/components/chat/ChatModal";
import { TradeReviewModal } from "@/features/trust/TradeReviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyTrades } from "@/hooks/trade/useMyTrades";

import { TradeCard } from "./TradeCard";
import { TradeRequestsModal } from "./TradeRequestsModal";
import { viewpointOf, type TradeRequest } from "./types";

/** 交換タブの先頭に並べる、自分の番の取引の最大件数。残りは受信箱で見る。 */
const SHOWN = 3;

/**
 * いま自分が動く番の取引。
 *
 * 届いた申請への返事、発送、受け取りの報告、完了後のコレクション反映。
 * 受信箱を開かなくても、交換タブを開いたその場で次の一手が押せるようにする。
 * 何も無いときは何も出さない（受信箱へは別のボタンから行ける）。
 */
export function MyTurnSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { myTurn, isLoading } = useMyTrades();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [chatTrade, setChatTrade] = useState<TradeRequest | null>(null);
  const [reviewTrade, setReviewTrade] = useState<TradeRequest | null>(null);

  if (isLoading || myTurn.length === 0) return null;

  const chatPartner = chatTrade ? viewpointOf(chatTrade, user?.id).partner : null;
  const reviewTarget = reviewTrade ? viewpointOf(reviewTrade, user?.id).partner : null;

  return (
    <>
      <Card data-tour="trade-my-turn" className="border-primary/40 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-primary" />
            {t("trade.myTurn.title", { n: myTurn.length })}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("trade.myTurn.desc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {myTurn.slice(0, SHOWN).map((trade) => (
            <TradeCard key={trade.id} trade={trade} onOpenChat={setChatTrade} onReview={setReviewTrade} />
          ))}
          {myTurn.length > SHOWN && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setInboxOpen(true)}>
              {t("trade.myTurn.seeAll", { n: myTurn.length - SHOWN })}
            </Button>
          )}
        </CardContent>
      </Card>

      <TradeRequestsModal isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />

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
