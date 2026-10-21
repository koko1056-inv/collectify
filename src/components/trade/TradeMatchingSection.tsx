import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDownUp, ArrowLeftRight, ChevronRight, Gift, Heart, ImageIcon, Layers, MessageCircle, PackageOpen, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
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
  useTradePartnerOffers,
  type TradeMatch,
  type TradeMatchItem,
  type TradePartnerItem,
  type TradeSeriesPartner,
} from "@/hooks/useTradeMatches";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

import { TradeOfferPicker } from "./TradeOfferPicker";
import { TradeRequestModal } from "./TradeRequestModal";
import { WishHoldersSection, type HolderRequestTarget } from "./WishHoldersSection";
import { InlineFollowButton } from "./InlineFollowButton";
import { PartnerCollectionPicker } from "./PartnerCollectionPicker";
import { TradeSectionHeader } from "./TradeSectionHeader";
import { SpotlightChip, TradeSpotlightCard } from "./TradeSpotlight";
import { useTradeSpotlightUsers } from "@/hooks/trade/useTradeSpotlight";
import { TradePostDialog } from "./TradePostDialog";
import { WishlistViewModal } from "@/components/WishlistViewModal";
import { PockeSays } from "@/components/pocke/Pocke";

/**
 * 交換相手の候補。
 *
 * いちばん上に「両想い」を置く。相手が交換に出しているものを自分が欲しくて、
 * かつ自分が交換に出しているものを相手が欲しがっている組み合わせで、
 * 話が最後までまとまる見込みがいちばん高い。
 * 片想いはその下に、それぞれ別の枠で出す。
 *
 * 「あなたのグッズをほしがっている人」は、相手が欲しいもの（自分の品）と、
 * 代わりにもらえるもの（相手が交換に出している品）を並べて見せ、
 * 相手の品を押せばそのまま申し込める（自分の品は選んだ状態で開く）。
 */
export function TradeMatchingSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedMatch, setSelectedMatch] = useState<{
    userId: string;
    itemId: string;
    itemTitle: string;
    itemImage?: string | null;
    partnerName?: string | null;
    partnerOffers?: boolean;
    /** 申し込み画面で最初から選んでおく、自分の差し出す品 */
    offeredItemId?: string | null;
  } | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  // 交換に出していない相手に、コレクションから選んで相談するときの相手と自分の品
  const [collectionTarget, setCollectionTarget] = useState<{
    partnerId: string;
    partnerName: string;
    myItem: TradeMatchItem;
  } | null>(null);
  const [isOfferPickerOpen, setIsOfferPickerOpen] = useState(false);
  // X の交換投稿用「譲・求」画像。?post=1 で開く（グッズの「交換」を初めてオンにしたときの案内から来る）
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPostOpen, setIsPostOpen] = useState(false);
  // 流れの札「ほしい」から開く、ほしいものの一覧（ヘッダーのかごと同じもの）
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  useEffect(() => {
    if (searchParams.get("post") !== "1") return;
    setIsPostOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("post");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data: matches, isLoading, isError, refetch } = useTradeMatches();
  const { data: readiness } = useTradeReadiness();
  const { data: seriesPartners } = useTradeSeriesPartners();
  const { data: myOffers = [] } = useMyTradeOffers();

  // サーバー側（find_trade_matches 等）もサンプルアカウントを除いているが、
  // サンプルアカウントは実ユーザーとやり取りしない運用ルールを画面側でも二重に守る。
  const safeMatches = useMemo(() => (matches ?? []).filter((m) => !m.partner_is_sample), [matches]);

  const { mutual, theyHave, theyWant } = useMemo(() => {
    return {
      mutual: safeMatches.filter((m) => m.is_mutual),
      theyHave: safeMatches.filter((m) => !m.is_mutual && m.their_items.length > 0),
      theyWant: safeMatches.filter((m) => !m.is_mutual && m.my_items.length > 0),
    };
  }, [safeMatches]);

  // 「ほしがっている人」全員の、交換に出している品を1回でまとめて引く
  const theyWantIds = useMemo(() => theyWant.map((m) => m.partner_id), [theyWant]);
  const {
    data: partnerOffers,
    isLoading: offersLoading,
    isError: offersError,
    refetch: refetchOffers,
  } = useTradePartnerOffers(theyWantIds);

  const seriesOnly = useMemo(() => {
    const already = new Set(safeMatches.map((m) => m.partner_id));
    return (seriesPartners ?? []).filter((p) => !already.has(p.partner_id) && !p.partner_is_sample);
  }, [safeMatches, seriesPartners]);

  // 注目中の相手（「注目」の印を付ける）。並びはサーバー側で注目中が先になっている
  const shownPartnerIds = useMemo(
    () => [...safeMatches.map((m) => m.partner_id), ...seriesOnly.map((p) => p.partner_id)],
    [safeMatches, seriesOnly]
  );
  const { data: spotlightUsers } = useTradeSpotlightUsers(shownPartnerIds);
  const isSpotlight = (partnerId: string) => !!spotlightUsers?.has(partnerId);

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


  /*
   * 並びの考え方: 交換は「交換に出す → ほしい → 相手をさがす → X で探す」の流れ。
   *  - いま自分が動く番の取引と受信箱は、画面の上のタブ「進行中」にある（Trade.tsx）。ここは相手をさがす側
   *  - いちばん上に、交換に出しているもの・ほしいものの2つの札（押せば選び直せる）
   *  - 本文も同じ順: 交換に出しているもの → 交換相手の候補（両想い・ほしいものを持っている人・片想い・同じ作品）→ X
   *  - ポイントで先に出す「注目」は、本題の流れの外なので最後に置く
   * 以前は X の入口・ほしいものを持っている人・準備の案内・出品の入口・注目…が順不同に並び、
   * 何から始めればいいのか読み取れなかった。
   */
  return (
    <div className="space-y-4">
      {/* 交換に出しているもの・ほしいもの。押せばそれぞれ選び直せる。
          以前は「4つの手順の札・交換に出すボタン・出しているグッズの帯」が並び（約330px）、同じ件数が3か所に出ていた。
          あなたの番の取引と受信箱は「進行中」のタブへ移した */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-tour="trade-offer-cta"
          onClick={() => setIsOfferPickerOpen(true)}
          aria-label={t("trade.summary.offerAria", { n: readiness?.offerCount ?? myOffers.length })}
          className={cn(
            "flex min-h-[3.75rem] items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
            (readiness?.offerCount ?? myOffers.length) === 0 ? "border-primary/50 bg-primary/5" : "border-border"
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-2xs text-muted-foreground">{t("trade.summary.offering")}</span>
            <span className="block text-base font-bold tabular-nums">
              {t("trade.summary.count", { n: readiness?.offerCount ?? myOffers.length })}
            </span>
          </span>
          {myOffers.length > 0 && (
            <span className="flex shrink-0 -space-x-3" aria-hidden="true">
              {myOffers.slice(0, 3).map((o) => (
                <img
                  key={o.id}
                  src={getOptimizedImageUrl(o.image, { width: 96 })}
                  onError={fallbackToOriginal(o.image)}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 rounded-lg border-2 border-card bg-muted object-cover"
                />
              ))}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => ((readiness?.wishCount ?? 0) > 0 ? setIsWishlistOpen(true) : navigate("/search?tab=goods"))}
          aria-label={t("trade.summary.wishAria", { n: readiness?.wishCount ?? 0 })}
          className={cn(
            "flex min-h-[3.75rem] items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
            (readiness?.wishCount ?? 0) === 0 ? "border-primary/50 bg-primary/5" : "border-border"
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-2xs text-muted-foreground">{t("trade.summary.wishing")}</span>
            <span className="block text-base font-bold tabular-nums">{t("trade.summary.count", { n: readiness?.wishCount ?? 0 })}</span>
          </span>
          <Heart className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        </button>
      </div>

      {/* 出しているもの・ほしいものが無いとき、足りないほうを名指しで案内する */}
      <ReadinessBanner
        wishCount={readiness?.wishCount ?? 0}
        offerCount={readiness?.offerCount ?? 0}
        surplusCount={readiness?.surplusCount ?? 0}
        onPickOffers={() => setIsOfferPickerOpen(true)}
      />

      {/* ③ 交換相手の候補。② の「ほしい」から見つかる相手（ほしいものを持っている人）もここに入れる */}
      <section id="trade-partners" className="scroll-mt-20 space-y-4" aria-label={t("trade.matching.flow.sectionPartners")}>
        <h2 className="text-sm font-bold">{t("trade.matching.flow.sectionPartners")}</h2>
        {/* 両想い */}
        <Card className="border-primary/30">
          <TradeSectionHeader
            icon={ArrowLeftRight}
            title={t("trade.matching.mutualTitle")}
            description={t("trade.matching.mutualDesc")}
          />
          <CardContent>
            {mutual.length === 0 ? (
              <EmptyState
                className="py-6"
                icon={ArrowLeftRight}
                title={t("trade.matching.noMutual")}
                description={t("trade.matching.noMutualDesc")}
                // 「何もない」で終わらせず、アプリの外（X）で相手をさがす次の一手を出す
                action={
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsPostOpen(true)}>
                    <ImageIcon className="h-4 w-4" />
                    {t("discover.tradePost.emptyMutualCta")}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {mutual.map((match) => (
                  <MutualMatchCard
                    key={match.partner_id}
                    match={match}
                    spotlight={isSpotlight(match.partner_id)}
                    onRequest={(item, myItem) =>
                      setSelectedMatch({
                        userId: match.partner_id,
                        itemId: item.id,
                        itemTitle: item.title,
                        itemImage: item.image,
                        partnerName: match.partner_username,
                        // 両想いなので、相手がほしがっている自分の品を最初から選んでおく
                        offeredItemId: myItem?.id ?? null,
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

        {/* 欲しいものを持っている人。そこから申請（相談）できる（両想いの次に話がまとまりやすい） */}
        <WishHoldersSection
          onRequest={(target: HolderRequestTarget) =>
            setSelectedMatch({
              userId: target.userId,
              itemId: target.itemId,
              itemTitle: target.itemTitle,
              itemImage: target.itemImage,
              partnerName: target.partnerName,
              partnerOffers: target.partnerOffers,
            })
          }
        />

        {/* 片想い: 相手が交換に出していて、自分が欲しい */}
        {theyHave.length > 0 && (
          <Card>
            <TradeSectionHeader icon={PackageOpen} title={t("trade.matching.haveYourWishlist")} />
            <CardContent className="space-y-3">
              {theyHave.map((match) => (
                <OneWayCard
                  key={match.partner_id}
                  match={match}
                  spotlight={isSpotlight(match.partner_id)}
                  items={match.their_items}
                  countLabel={t("trade.matching.matchCount", {
                    count: match.their_items.length,
                  })}
                  onItemClick={(item) =>
                    // 差し出す品は、申し込み画面が「相手がほしがっている品」を先頭に並べ、あれば選んでおく
                    setSelectedMatch({
                      userId: match.partner_id,
                      itemId: item.id,
                      itemTitle: item.title,
                      itemImage: item.image,
                      partnerName: match.partner_username,
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
          <Card data-testid="they-want-section">
            <TradeSectionHeader
              icon={Gift}
              title={t("trade.matching.wantYourItems")}
              description={t("trade.matching.wantYourItemsDesc")}
            />
            <CardContent className="space-y-3">
              {theyWant.map((match) => (
                <TheyWantCard
                  key={match.partner_id}
                  match={match}
                  spotlight={isSpotlight(match.partner_id)}
                  offers={partnerOffers?.[match.partner_id] ?? []}
                  offersLoading={offersLoading}
                  offersError={offersError}
                  onRetryOffers={() => refetchOffers()}
                  onRequest={(theirItem, myItem) =>
                    setSelectedMatch({
                      userId: match.partner_id,
                      itemId: theirItem.id,
                      itemTitle: theirItem.title,
                      itemImage: theirItem.image,
                      partnerName: match.partner_username,
                      partnerOffers: theirItem.for_trade,
                      offeredItemId: myItem.id,
                    })
                  }
                  onBrowse={(myItem) =>
                    setCollectionTarget({
                      partnerId: match.partner_id,
                      partnerName: match.partner_username || t("trade.match.userFallback"),
                      myItem,
                    })
                  }
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
            <TradeSectionHeader
              icon={Layers}
              title={t("trade.matching.sameSeriesTitle")}
              description={t("trade.matching.sameSeriesDesc")}
            />
            <CardContent className="space-y-3">
              {seriesOnly.map((partner) => (
                <SeriesPartnerCard
                  key={partner.partner_id}
                  partner={partner}
                  spotlight={isSpotlight(partner.partner_id)}
                  onItemClick={(item) =>
                    setSelectedMatch({
                      userId: partner.partner_id,
                      itemId: item.id,
                      itemTitle: item.title,
                      partnerName: partner.partner_username,
                    })
                  }
                  onOpenChat={() => openChat(partner.partner_id)}
                  onOpenProfile={() => navigate(`/user/${partner.partner_id}`)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ④ X で探す */}
      <section className="space-y-2" aria-label={t("trade.matching.flow.sectionX")}>
        <h2 className="text-sm font-bold">{t("trade.matching.flow.sectionX")}</h2>
        {/* X の「譲・求」投稿の画像を作る入口。アプリの中の交換相手がまだ少ないうちは、
            推し活の交換の中心である X で相手をさがすのがいちばん早い。
            流れの4番目なので相手の候補の下に置く（上の4つの札からもすぐ開ける） */}
        <button
          type="button"
          data-testid="trade-post-entry"
          onClick={() => setIsPostOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
        >
          <IconTile size="sm" tone="primary">
            <ImageIcon />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("discover.tradePost.entryTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("discover.tradePost.entryDesc")}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

      </section>

      {/* 注目を集める（ポイントで、自分の交換グッズを相手の一覧で先に出す） */}
      <TradeSpotlightCard
        offerCount={readiness?.offerCount ?? myOffers.length}
        onNeedOffers={() => setIsOfferPickerOpen(true)}
      />

      <TradeOfferPicker open={isOfferPickerOpen} onOpenChange={setIsOfferPickerOpen} />

      <TradePostDialog
        open={isPostOpen}
        onOpenChange={setIsPostOpen}
        onPickOffers={() => {
          setIsPostOpen(false);
          setIsOfferPickerOpen(true);
        }}
      />

      {selectedMatch && (
        <TradeRequestModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          requestedItemId={selectedMatch.itemId}
          requestedItemTitle={selectedMatch.itemTitle}
          requestedItemImage={selectedMatch.itemImage}
          partnerName={selectedMatch.partnerName}
          partnerOffers={selectedMatch.partnerOffers ?? true}
          receiverId={selectedMatch.userId}
          preselectedOfferedItemId={selectedMatch.offeredItemId ?? null}
        />
      )}

      {collectionTarget && (
        <PartnerCollectionPicker
          open={!!collectionTarget}
          onClose={() => setCollectionTarget(null)}
          partnerId={collectionTarget.partnerId}
          partnerName={collectionTarget.partnerName}
          myItemTitle={collectionTarget.myItem.title}
          onOpenChat={() => {
            const pid = collectionTarget.partnerId;
            setCollectionTarget(null);
            openChat(pid);
          }}
          onPick={(item) => {
            // 選んだ相手の品を「もらいたい品」、相手がほしがっている自分の品を「差し出す品」にして申し込み画面へ
            const target = collectionTarget;
            setCollectionTarget(null);
            setSelectedMatch({
              userId: target.partnerId,
              itemId: item.id,
              itemTitle: item.title,
              itemImage: item.image,
              partnerName: target.partnerName,
              partnerOffers: item.for_trade,
              offeredItemId: target.myItem.id,
            });
          }}
        />
      )}

      {chatPartnerId && (
        <ChatModal
          isOpen={!!chatPartnerId}
          onClose={() => setChatPartnerId(null)}
          partnerId={chatPartnerId}
        />
      )}

      <WishlistViewModal isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
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

  // ポッケが「次はこれ」と話しかける形（ダブりがあるときは袋のポッケ、ほかは指さし）
  return (
    <div data-tour="trade-readiness">
      <PockeSays pose={offerCount === 0 && surplusCount > 0 ? "pouch" : "point"} height={80}>
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
      </PockeSays>
    </div>
  );
}

/**
 * 同じ作品を集めている相手のカード。
 * 完全一致の「両想い／片想い」と見分けがつくよう、重なっている作品名を見せる。
 */
function SeriesPartnerCard({
  partner,
  spotlight,
  onItemClick,
  onOpenChat,
  onOpenProfile,
}: {
  partner: TradeSeriesPartner;
  spotlight: boolean;
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
          <AvatarFallback className="bg-info-soft text-info">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenProfile}
            className="tap-safe-y flex max-w-full items-center gap-1 text-left font-medium transition-colors hover:text-primary"
          >
            <span className="truncate">{name}</span>
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {spotlight && <SpotlightChip />}
            {partner.shared_series.slice(0, 2).map((series) => (
              <Badge key={series} variant="secondary" className="px-1.5 py-0 text-3xs">
                {series}
              </Badge>
            ))}
            {partner.shared_series.length > 2 && (
              <span className="text-3xs text-muted-foreground">
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
            <p className="mt-1 truncate text-3xs text-muted-foreground">{item.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PartnerHeader({
  match,
  badge,
  spotlight = false,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  badge: React.ReactNode;
  /** 相手が「注目」を使っている */
  spotlight?: boolean;
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
          className="tap-safe-y flex max-w-full items-center gap-1 text-left font-medium transition-colors hover:text-primary"
        >
          <span className="truncate">{name}</span>
        </button>
        <div className="flex flex-wrap items-center gap-1">
          {spotlight && <SpotlightChip />}
          {badge}
        </div>
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
  spotlight,
  onRequest,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  spotlight: boolean;
  onRequest: (item: TradeMatchItem, myItem: TradeMatchItem | undefined) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();
  // 相手が出している品が複数あるときは、どれを申し込むか選べる（以前は先頭の1つに固定だった）
  const [pickedId, setPickedId] = useState<string | null>(null);
  const theirTop = match.their_items.find((i) => i.id === pickedId) ?? match.their_items[0];
  const myTop = match.my_items[0];

  return (
    <div className="rounded-lg border border-primary/30 bg-background p-3 shadow-sm">
      <PartnerHeader
        match={match}
        spotlight={spotlight}
        badge={
          // 状態の印は、色の薄い面に文字だけ（キラキラなどの飾りは付けない）
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
            {t("trade.matching.mutualBadge")}
          </span>
        }
        onOpenChat={onOpenChat}
        onOpenProfile={onOpenProfile}
      />

      {/* min-w-0 が無いと 1fr の列が min-content 未満に縮まず、
          グッズ名が長いときに画面の外まで伸びてしまう */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <p className="mb-1 truncate text-2xs text-muted-foreground">
            {t("trade.matching.youGet")}
          </p>
          {theirTop && <ItemThumb item={theirTop} />}
        </div>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="mb-1 truncate text-2xs text-muted-foreground">
            {t("trade.matching.youGive")}
          </p>
          {myTop && <ItemThumb item={myTop} />}
        </div>
      </div>

      {match.their_items.length > 1 && (
        <div className="mt-3">
          <p className="mb-1 text-2xs text-muted-foreground">{t("trade.matching.pickTheirs")}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {match.their_items.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPickedId(item.id)}
                aria-pressed={theirTop?.id === item.id}
                aria-label={item.title}
                className={
                  "h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted " +
                  (theirTop?.id === item.id ? "border-primary ring-2 ring-primary/40" : "border-border")
                }
              >
                <img
                  src={getOptimizedImageUrl(item.image, { width: 96 })}
                  onError={fallbackToOriginal(item.image)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        className="mt-3 w-full gap-1"
        size="sm"
        disabled={!theirTop}
        onClick={() => theirTop && onRequest(theirTop, myTop)}
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
  spotlight,
  items,
  countLabel,
  onItemClick,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  spotlight: boolean;
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
        spotlight={spotlight}
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
        <p className="mt-2 text-2xs text-muted-foreground">
          {t("trade.matching.andMore", { count: items.length - 3 })}
        </p>
      )}
    </div>
  );
}

/**
 * 片想い: 相手が自分の品を欲しがっている。
 *
 * 以前はほしがられている自分の品を並べるだけで、押しても何も起きず、
 * 「相手と何を交換できるのか」が分からない行き止まりだった。
 * いまは「相手がほしいもの（あなたの）」⇅「代わりにもらえるもの（相手が交換に出している品）」を
 * 両想いのカードと同じ考え方で並べ、相手の品を押せば、自分の品を選んだ状態で申し込み画面が開く。
 * 相手が何も交換に出していないときは、そう伝えたうえで
 * 「相手のコレクションから選んで相談する」「チャットで聞く」の2つの出口を出す。
 */
function TheyWantCard({
  match,
  spotlight,
  offers,
  offersLoading,
  offersError,
  onRetryOffers,
  onRequest,
  onBrowse,
  onOpenChat,
  onOpenProfile,
}: {
  match: TradeMatch;
  spotlight: boolean;
  offers: TradePartnerItem[];
  offersLoading: boolean;
  offersError: boolean;
  onRetryOffers: () => void;
  onRequest: (theirItem: TradePartnerItem, myItem: TradeMatchItem) => void;
  onBrowse: (myItem: TradeMatchItem) => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
}) {
  const { t } = useLanguage();
  const name = match.partner_username || t("trade.match.userFallback");
  // 相手がほしがっている自分の品が複数あるときは、どれを渡すか選べる（最初は先頭）
  const [myPickId, setMyPickId] = useState<string | null>(null);
  const mine = match.my_items.find((i) => i.id === myPickId) ?? match.my_items[0];
  const canPickMine = match.my_items.length > 1;

  if (!mine) return null;

  return (
    <div data-testid="they-want-card" className="rounded-lg border bg-background p-3">
      <PartnerHeader
        match={match}
        spotlight={spotlight}
        badge={
          <Badge variant="secondary" className="text-xs">
            {t("trade.matching.wantCount", { count: match.my_items.length })}
          </Badge>
        }
        onOpenChat={onOpenChat}
        onOpenProfile={onOpenProfile}
      />

      {/* 相手がほしいもの（あなたの） */}
      <div className="mt-3">
        <p className="mb-1.5 text-2xs font-medium text-muted-foreground">{t("trade.matching.theyWantMine")}</p>
        <div className="flex items-center gap-2.5">
          <div className="flex shrink-0 gap-1.5">
            {match.my_items.slice(0, 4).map((item) => {
              const picked = item.id === mine.id;
              const thumb = (
                <img
                  src={getOptimizedImageUrl(item.image, { width: 112 })}
                  onError={fallbackToOriginal(item.image)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              );
              return canPickMine ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMyPickId(item.id)}
                  aria-pressed={picked}
                  aria-label={item.title}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-lg border bg-muted transition-colors",
                    picked ? "border-primary ring-2 ring-primary/40" : "border-border opacity-70 hover:opacity-100"
                  )}
                >
                  {thumb}
                </button>
              ) : (
                <div key={item.id} className="h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted">
                  {thumb}
                </div>
              );
            })}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{mine.title}</p>
            {canPickMine && (
              <p className="mt-0.5 text-2xs text-muted-foreground">{t("trade.matching.theyWantMinePick")}</p>
            )}
          </div>
        </div>
      </div>

      {/* 「この2つを入れ替える」ことを、区切り線の上の矢印1つで示す */}
      <div className="my-3 flex items-center gap-2 text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <ArrowDownUp className="h-4 w-4" />
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* 代わりにもらえるもの（相手が交換に出しているもの） */}
      <div>
        <p className="mb-1.5 text-2xs font-medium text-muted-foreground">
          {t("trade.matching.theyWantTheirs")}
          <span className="font-normal">（{t("trade.matching.theyWantTheirsSub")}）</span>
        </p>

        {offersLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-24 shrink-0 rounded-lg" />
            ))}
          </div>
        ) : offersError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2.5">
            <p className="text-xs text-muted-foreground">{t("trade.matching.theyWantLoadFailed")}</p>
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={onRetryOffers}>
              {t("misc.common.retry")}
            </Button>
          </div>
        ) : offers.length > 0 ? (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
              {offers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid="they-want-offer"
                  onClick={() => onRequest(item, mine)}
                  className="w-24 shrink-0 text-left"
                  aria-label={item.title}
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-primary/50">
                    <img
                      src={getOptimizedImageUrl(item.image, { width: 192 })}
                      onError={fallbackToOriginal(item.image)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                    {item.already_requested && (
                      <span className="absolute inset-x-1 bottom-1 rounded-md bg-background/90 py-0.5 text-center text-3xs font-semibold text-muted-foreground">
                        {t("trade.matching.theyWantRequested")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-2xs leading-tight">{item.title}</p>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-2xs text-muted-foreground">{t("trade.matching.theyWantTapHint")}</p>
          </>
        ) : (
          // 相手が何も交換に出していない。黙って空にせず、そう伝えて次の一手を2つ出す
          <div className="space-y-2.5 rounded-lg bg-muted/50 p-3">
            <p className="text-xs leading-relaxed">{t("trade.matching.theyWantNoOffers", { name })}</p>
            <div className="grid gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid="they-want-browse"
                // 文言が長いので、狭い画面では折り返して枠からはみ出さないようにする
                className="h-auto min-h-9 w-full justify-center gap-1.5 whitespace-normal bg-background py-2 text-xs"
                onClick={() => onBrowse(mine)}
              >
                <Search className="h-4 w-4" />
                {t("trade.matching.theyWantBrowse")}
              </Button>
              <Button size="sm" variant="ghost" className="h-9 w-full justify-center gap-1.5 text-xs" onClick={onOpenChat}>
                <MessageCircle className="h-4 w-4" />
                {t("trade.matching.theyWantAskChat")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
