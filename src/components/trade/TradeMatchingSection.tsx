import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Gift, Heart, Layers, MessageCircle, Sparkles } from "lucide-react";

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
import {
  useTradeMatches,
  useTradeReadiness,
  useTradeSeriesPartners,
  useMyTradeOffers,
  type TradeMatch,
  type TradeSeriesPartner,
} from "@/hooks/useTradeMatches";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

import { TradeOfferPicker } from "./TradeOfferPicker";
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
  const [isOfferPickerOpen, setIsOfferPickerOpen] = useState(false);

  const { data: matches, isLoading, isError, refetch } = useTradeMatches();
  const { data: readiness } = useTradeReadiness();
  const { data: seriesPartners } = useTradeSeriesPartners();
  const { data: myOffers = [] } = useMyTradeOffers();

  const { mutual, theyHave, theyWant } = useMemo(() => {
    const all = matches ?? [];
    return {
      mutual: all.filter((m) => m.is_mutual),
      theyHave: all.filter((m) => !m.is_mutual && m.their_items.length > 0),
      theyWant: all.filter((m) => !m.is_mutual && m.my_items.length > 0),
    };
  }, [matches]);

  const seriesOnly = useMemo(() => {
    const already = new Set((matches ?? []).map((m) => m.partner_id));
    return (seriesPartners ?? []).filter((p) => !already.has(p.partner_id));
  }, [matches, seriesPartners]);

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
        surplusCount={readiness?.surplusCount ?? 0}
        onPickOffers={() => setIsOfferPickerOpen(true)}
      />

      {/* 出品の常設入口。準備バナーは条件が揃うと消えるので、
          「交換に出すものを増やす／やめる」入口がそこだけだと無くなる。 */}
      <button
        type="button"
        data-tour="trade-offer-cta"
        onClick={() => setIsOfferPickerOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="rounded-lg bg-primary/10 p-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("trade.picker.openTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("trade.picker.openDesc", { n: readiness?.offerCount ?? 0 })}
          </p>
        </div>
      </button>

      {/* 自分が出しているグッズ。マッチが無いうちも「出せている」ことが見える */}
      {myOffers.length > 0 && (
        <section className="space-y-2" aria-label={t("trade.picker.mineTitle", { n: myOffers.length })}>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold">{t("trade.picker.mineTitle", { n: myOffers.length })}</h3>
            <button
              type="button"
              onClick={() => setIsOfferPickerOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("trade.picker.mineEdit")}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {myOffers.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setIsOfferPickerOpen(true)}
                className="relative w-20 shrink-0 text-left"
                aria-label={o.title}
              >
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted/30">
                  <img src={getOptimizedImageUrl(o.image, { width: 160 })} onError={fallbackToOriginal(o.image)} alt="" loading="lazy" className="h-full w-full object-contain" />
                </div>
                {o.quantity >= 2 && (
                  <span className="absolute right-1 top-1 rounded-full bg-foreground/85 px-1.5 text-[10px] font-semibold text-background">×{o.quantity}</span>
                )}
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight">{o.title}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("trade.picker.mineHint")}</p>
        </section>
      )}

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

      {/* 同じ作品を集めている人。完全一致が出ないうちは、ここが
          実際に話しかけられる唯一の相手になる。 */}
      {seriesOnly.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-sky-500" />
              {t("trade.matching.sameSeriesTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("trade.matching.sameSeriesDesc")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {seriesOnly.map((partner) => (
              <SeriesPartnerCard
                key={partner.partner_id}
                partner={partner}
                onItemClick={(item) =>
                  setSelectedMatch({
                    userId: partner.partner_id,
                    itemId: item.id,
                    itemTitle: item.title,
                  })
                }
                onOpenChat={() => openChat(partner.partner_id)}
                onOpenProfile={() => navigate(`/user/${partner.partner_id}`)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <TradeOfferPicker open={isOfferPickerOpen} onOpenChange={setIsOfferPickerOpen} />

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
  surplusCount,
  onPickOffers,
}: {
  wishCount: number;
  offerCount: number;
  surplusCount: number;
  onPickOffers: () => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (wishCount > 0 && offerCount > 0) return null;

  // 交換に出しているものが無い人には、まずダブりを見せる。
  // 「何か出してください」より「その2個目、出しませんか」のほうが動ける。
  const message =
    offerCount === 0 && surplusCount > 0
      ? t("trade.matching.setupSurplus", { count: surplusCount })
      : wishCount === 0 && offerCount === 0
        ? t("trade.matching.setupBoth")
        : wishCount === 0
          ? t("trade.matching.setupWish")
          : t("trade.matching.setupOffer");

  return (
    <div
      data-tour="trade-readiness"
      className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3"
    >
      <p className="text-sm">{message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {wishCount === 0 && (
          <Button size="sm" variant="outline" onClick={() => navigate("/search?tab=goods")}>
            {t("trade.matching.setupWishCta")}
          </Button>
        )}
        {offerCount === 0 && (
          // 以前は /collection へ飛ばしていた。だがコレクション画面には
          // 交換に出す操作が無く（グッズ詳細モーダルの奥だけ）、
          // 言われた通りに押しても何もできない行き止まりだった。
          <Button size="sm" variant="outline" onClick={onPickOffers}>
            {t("trade.matching.setupOfferCta")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 同じ作品を集めている相手のカード。
 * 完全一致の「両想い／片想い」と見分けがつくよう、重なっている作品名を見せる。
 */
function SeriesPartnerCard({
  partner,
  onItemClick,
  onOpenChat,
  onOpenProfile,
}: {
  partner: TradeSeriesPartner;
  onItemClick: (item: { id: string; title: string }) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();
  const name = partner.partner_username || t("trade.match.userFallback");

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 cursor-pointer" onClick={onOpenProfile}>
          <AvatarImage src={partner.partner_avatar_url || undefined} />
          <AvatarFallback className="bg-sky-500/10 text-sky-600">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenProfile}
            className="tap-safe-y block max-w-full truncate text-left font-medium transition-colors hover:text-primary"
          >
            {name}
          </button>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {partner.shared_series.slice(0, 2).map((series) => (
              <Badge key={series} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {series}
              </Badge>
            ))}
            {partner.shared_series.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                {t("trade.matching.seriesMore", { n: partner.shared_series.length - 2 })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <InlineFollowButton userId={partner.partner_id} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenChat}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {partner.their_items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="w-20 shrink-0 text-left"
            title={item.title}
          >
            <img
              src={getOptimizedImageUrl(item.image, { width: 160 })}
              onError={fallbackToOriginal(item.image)}
              alt={item.title}
              loading="lazy"
              className="h-20 w-20 rounded-lg border border-border bg-muted/30 object-contain transition-opacity hover:opacity-80"
            />
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{item.title}</p>
          </button>
        ))}
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
          className="tap-safe-y block max-w-full truncate text-left font-medium transition-colors hover:text-primary"
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
        className="tap-safe-y h-8 w-8 shrink-0"
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
          className="h-full w-full object-contain"
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

      {/* min-w-0 が無いと 1fr の列が min-content 未満に縮まず、
          グッズ名が長いときに画面の外まで伸びてしまう */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <p className="mb-1 truncate text-[11px] text-muted-foreground">
            {t("trade.matching.youGet")}
          </p>
          {theirTop && <ItemThumb item={theirTop} />}
        </div>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="mb-1 truncate text-[11px] text-muted-foreground">
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
