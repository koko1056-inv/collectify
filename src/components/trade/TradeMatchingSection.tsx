import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Gift, Heart, MessageCircle, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ChatModal } from "@/components/chat/ChatModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTradeMatches, useTradeReadiness, type TradeMatch } from "@/hooks/useTradeMatches";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

import { TradeRequestModal } from "./TradeRequestModal";
import { TradeInboxButton } from "./TradeInboxButton";
import { InlineFollowButton } from "./InlineFollowButton";

/**
 * 交換相手の候補。
 *
 * いちばん上に「両想い」を置く。相手が交換に出しているものを自分が欲しくて、
 * かつ自分が交換に出しているものを相手が欲しがっている組み合わせで、
 * 話が最後までまとまる見込みがいちばん高い。
 * 片想いはその下に、それぞれ別の枠で出す。
 */
export function TradeMatchingSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedMatch, setSelectedMatch] = useState<{
    userId: string;
    itemId: string;
    itemTitle: string;
  } | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  const { data: matches, isLoading, isError, refetch } = useTradeMatches();
  const { data: readiness } = useTradeReadiness();

  const { mutual, theyHave, theyWant } = useMemo(() => {
    const all = matches ?? [];
    return {
      mutual: all.filter((m) => m.is_mutual),
      theyHave: all.filter((m) => !m.is_mutual && m.their_items.length > 0),
      theyWant: all.filter((m) => !m.is_mutual && m.my_items.length > 0),
    };
  }, [matches]);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{t("trade.matching.loginPrompt")}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState title={t("trade.matching.loadFailed")} onRetry={() => refetch()} />
    );
  }

  const openChat = (partnerId: string) => setChatPartnerId(partnerId);

  return (
    <div className="space-y-4">
      {/* 進行中の交換への入口。申し込んだあと戻ってくる場所がここになる */}
      <TradeInboxButton variant="full" />

      <ReadinessBanner
        wishCount={readiness?.wishCount ?? 0}
        offerCount={readiness?.offerCount ?? 0}
      />

      {/* 両想い */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("trade.matching.mutualTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("trade.matching.mutualDesc")}</p>
        </CardHeader>
        <CardContent>
          {mutual.length === 0 ? (
            <EmptyState
              className="py-6"
              icon={ArrowLeftRight}
              title={t("trade.matching.noMutual")}
              description={t("trade.matching.noMutualDesc")}
            />
          ) : (
            <div className="space-y-3">
              {mutual.map((match) => (
                <MutualMatchCard
                  key={match.partner_id}
                  match={match}
                  onRequest={(item) =>
                    setSelectedMatch({
                      userId: match.partner_id,
                      itemId: item.id,
                      itemTitle: item.title,
                    })
                  }
                  onOpenChat={() => openChat(match.partner_id)}
                  onOpenProfile={() => navigate(`/user/${match.partner_id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 片想い: 相手が交換に出していて、自分が欲しい */}
      {theyHave.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-4 h-4 text-primary" />
              {t("trade.matching.haveYourWishlist")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {theyHave.map((match) => (
              <OneWayCard
                key={match.partner_id}
                match={match}
                items={match.their_items}
                countLabel={t("trade.matching.matchCount", {
                  count: match.their_items.length,
                })}
                onItemClick={(item) =>
                  setSelectedMatch({
                    userId: match.partner_id,
                    itemId: item.id,
                    itemTitle: item.title,
                  })
                }
                onOpenChat={() => openChat(match.partner_id)}
                onOpenProfile={() => navigate(`/user/${match.partner_id}`)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 片想い: 自分が交換に出していて、相手が欲しがっている */}
      {theyWant.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="w-4 h-4 text-amber-500" />
              {t("trade.matching.wantYourItems")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {theyWant.map((match) => (
              <OneWayCard
                key={match.partner_id}
                match={match}
                items={match.my_items}
                countLabel={t("trade.matching.wantCount", { count: match.my_items.length })}
                onOpenChat={() => openChat(match.partner_id)}
                onOpenProfile={() => navigate(`/user/${match.partner_id}`)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {selectedMatch && (
        <TradeRequestModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          requestedItemId={selectedMatch.itemId}
          requestedItemTitle={selectedMatch.itemTitle}
          receiverId={selectedMatch.userId}
        />
      )}

      {chatPartnerId && (
        <ChatModal
          isOpen={!!chatPartnerId}
          onClose={() => setChatPartnerId(null)}
          partnerId={chatPartnerId}
        />
      )}
    </div>
  );
}

/**
 * マッチが出ないとき、原因は「欲しいものを登録していない」か
 * 「交換に出しているものが無い」のどちらか。黙って空にせず、
 * 足りないほうを名指しで伝える。
 */
function ReadinessBanner({
  wishCount,
  offerCount,
}: {
  wishCount: number;
  offerCount: number;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (wishCount > 0 && offerCount > 0) return null;

  const missingBoth = wishCount === 0 && offerCount === 0;
  const message = missingBoth
    ? t("trade.matching.setupBoth")
    : wishCount === 0
      ? t("trade.matching.setupWish")
      : t("trade.matching.setupOffer");

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="text-sm">{message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {wishCount === 0 && (
          <Button size="sm" variant="outline" onClick={() => navigate("/search?tab=goods")}>
            {t("trade.matching.setupWishCta")}
          </Button>
        )}
        {offerCount === 0 && (
          <Button size="sm" variant="outline" onClick={() => navigate("/collection")}>
            {t("trade.matching.setupOfferCta")}
          </Button>
        )}
      </div>
    </div>
  );
}

function PartnerHeader({
  match,
  badge,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  badge: React.ReactNode;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();
  const name = match.partner_username || t("trade.match.userFallback");

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 cursor-pointer" onClick={onOpenProfile}>
        <AvatarImage src={match.partner_avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenProfile}
          className="block max-w-full truncate text-left font-medium transition-colors hover:text-primary"
        >
          {name}
        </button>
        {badge}
      </div>
      <InlineFollowButton userId={match.partner_id} size="icon" />
      <Button
        variant="outline"
        size="icon"
        onClick={onOpenChat}
        aria-label={t("trade.matching.chatAria")}
        className="h-8 w-8 shrink-0"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ItemThumb({
  item,
  onClick,
}: {
  item: { id: string; title: string; image: string };
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
        <img
          src={getOptimizedImageUrl(item.image, { width: 200 })}
          onError={fallbackToOriginal(item.image)}
          loading="lazy"
          decoding="async"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-1 truncate text-xs">{item.title}</p>
    </>
  );

  if (!onClick) return <div className="min-w-0">{content}</div>;

  return (
    <button type="button" onClick={onClick} className="min-w-0 text-left">
      {content}
    </button>
  );
}

/** 両想い: 何と何を交換できるのかを一目で見せる */
function MutualMatchCard({
  match,
  onRequest,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  onRequest: (item: { id: string; title: string; image: string }) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();
  const theirTop = match.their_items[0];
  const myTop = match.my_items[0];

  return (
    <div className="rounded-lg border border-primary/30 bg-background p-3 shadow-sm">
      <PartnerHeader
        match={match}
        badge={
          <Badge className="text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            {t("trade.matching.mutualBadge")}
          </Badge>
        }
        onOpenChat={onOpenChat}
        onOpenProfile={onOpenProfile}
      />

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">
            {t("trade.matching.youGet")}
          </p>
          {theirTop && <ItemThumb item={theirTop} />}
        </div>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">
            {t("trade.matching.youGive")}
          </p>
          {myTop && <ItemThumb item={myTop} />}
        </div>
      </div>

      {(match.their_items.length > 1 || match.my_items.length > 1) && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("trade.matching.moreCombos", {
            count: match.their_items.length * match.my_items.length - 1,
          })}
        </p>
      )}

      <Button
        className="mt-3 w-full gap-1"
        size="sm"
        disabled={!theirTop}
        onClick={() => theirTop && onRequest(theirTop)}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        {t("trade.matching.requestCta")}
      </Button>
    </div>
  );
}

/** 片想い: 相手側／自分側のどちらか一方だけが揃っている状態 */
function OneWayCard({
  match,
  items,
  countLabel,
  onItemClick,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  items: { id: string; title: string; image: string }[];
  countLabel: string;
  onItemClick?: (item: { id: string; title: string; image: string }) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg border bg-background p-3">
      <PartnerHeader
        match={match}
        badge={
          <Badge variant="secondary" className="text-xs">
            {countLabel}
          </Badge>
        }
        onOpenChat={onOpenChat}
        onOpenProfile={onOpenProfile}
      />
      {/* 390px 幅だと4列は題名が潰れるので3列まで。残りは件数で伝える */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <ItemThumb
            key={item.id}
            item={item}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        ))}
      </div>
      {items.length > 3 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("trade.matching.andMore", { count: items.length - 3 })}
        </p>
      )}
    </div>
  );
}
