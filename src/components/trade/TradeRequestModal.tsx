import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Gift, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { invalidateTrades, useMyTrades } from "@/hooks/trade/useMyTrades";
import { createTradeRequest, tradeErrorKey } from "@/services/trade/tradeStateMachine";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface TradeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedItemId: string;
  requestedItemTitle: string;
  receiverId: string;
  /** 欲しい品の写真（あれば申請画面の上に出す） */
  requestedItemImage?: string | null;
  /** 相手の名前（あれば案内文に使う） */
  partnerName?: string | null;
  /** 相手がその品を「交換に出す」にしているか。false なら、相談としての申請になる */
  partnerOffers?: boolean;
  /**
   * 開いたときに選んでおく、差し出す品（自分の user_items の id）。
   * 「あなたのグッズをほしがっている人」から来たときは、相手がほしがっている品を最初から選んでおく。
   * 渡さないときは、相手がほしがっている品が持ち物にあればそれを選んでおく。
   */
  preselectedOfferedItemId?: string | null;
}

/**
 * 交換の申し込み。
 *
 * 差し出す品は、持っているグッズから選ぶ。
 * 「相手が欲しがっている品」→「交換に出している品」→ それ以外 の順に並べて、
 * 話がまとまりやすいものを先に見せる。交換に出していない品も選べるが、その旨を伝える。
 * 別の交換がすでに成立している品は選べない。
 * 相手がほしがっている品は、最初から選んだ状態にしておく（変えることもできる）。
 */
export function TradeRequestModal({
  isOpen,
  onClose,
  requestedItemId,
  requestedItemTitle,
  receiverId,
  requestedItemImage,
  partnerName,
  partnerOffers = true,
  preselectedOfferedItemId = null,
}: TradeRequestModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState("");
  // 「相手がほしい品」を自動で選ぶのは、開いた直後の1回だけ（自分で選び直したものを上書きしない）
  const autoPicked = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemId(preselectedOfferedItemId);
      autoPicked.current = !!preselectedOfferedItemId;
      setMessage("");
      setSearch("");
    }
  }, [isOpen, preselectedOfferedItemId]);

  // 差し出せる品: 持っているグッズ全部（交換に出していないものも選べる）
  const { data: myItems = [], isLoading } = useQuery({
    queryKey: ["trade-offerable-items", user?.id],
    enabled: isOpen && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, for_trade, official_item_id, quantity")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 相手が欲しがっている品（相手の「欲しい」と、自分の持ち物の重なり）
  const myOfficialIds = useMemo(
    () => myItems.map((i) => i.official_item_id).filter((v): v is string => !!v),
    [myItems]
  );
  const { data: wantedByPartner = new Set<string>() } = useQuery({
    queryKey: ["trade-partner-wants", receiverId, myOfficialIds.length],
    enabled: isOpen && myOfficialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id")
        .eq("user_id", receiverId)
        .in("official_item_id", myOfficialIds);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.official_item_id as string));
    },
  });

  // 別の交換が成立している（承認済み）品は差し出せない
  const { active } = useMyTrades(isOpen);
  const busyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tr of active) {
      if (tr.offered_item?.id) ids.add(tr.offered_item.id);
      if (tr.requested_item?.id) ids.add(tr.requested_item.id);
    }
    return ids;
  }, [active]);

  const offerable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myItems
      .filter((i) => !busyIds.has(i.id))
      .filter((i) => !q || i.title.toLowerCase().includes(q))
      .map((i) => ({ ...i, wanted: !!i.official_item_id && wantedByPartner.has(i.official_item_id) }))
      .sort(
        (a, b) =>
          Number(b.id === preselectedOfferedItemId) - Number(a.id === preselectedOfferedItemId) ||
          Number(b.wanted) - Number(a.wanted) ||
          Number(b.for_trade) - Number(a.for_trade)
      );
  }, [myItems, busyIds, search, wantedByPartner, preselectedOfferedItemId]);

  // 相手がほしがっている品が持ち物にあれば、最初からそれを選んでおく。
  // 話がまとまりやすい品を、わざわざ探して押させない。
  useEffect(() => {
    if (!isOpen || autoPicked.current || selectedItemId) return;
    const top = offerable[0];
    if (top?.wanted) {
      autoPicked.current = true;
      setSelectedItemId(top.id);
    }
  }, [isOpen, offerable, selectedItemId]);

  // 別の交換で成立済みになった品は、選んであっても差し出せない
  const selectedItem = useMemo(
    () => (selectedItemId && !busyIds.has(selectedItemId) ? myItems.find((i) => i.id === selectedItemId) ?? null : null),
    [myItems, selectedItemId, busyIds]
  );
  const selectedWanted =
    !!selectedItem &&
    (selectedItem.id === preselectedOfferedItemId ||
      (!!selectedItem.official_item_id && wantedByPartner.has(selectedItem.official_item_id)));

  // 同じ相手の同じグッズに二重で申し込まないようにする
  const { data: alreadyRequested } = useQuery({
    queryKey: ["trade-exists", user?.id, requestedItemId],
    enabled: isOpen && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_requests")
        .select("id")
        .eq("sender_id", user!.id)
        .eq("requested_item_id", requestedItemId)
        .in("status", ["pending", "accepted"])
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const canSend = useMemo(
    () => !!selectedItem && !isSending && !alreadyRequested,
    [selectedItem, isSending, alreadyRequested]
  );

  const send = async () => {
    if (!user || !selectedItem) return;
    setIsSending(true);
    try {
      const result = await createTradeRequest({
        requestedItemId,
        offeredItemId: selectedItem.id,
        message,
      });
      if (!result.ok) {
        const reason = "reason" in result ? result.reason : "unknown";
        toast.error(t("trade.errors.title"), { description: t(tradeErrorKey(reason)) });
        await invalidateTrades(queryClient, user.id);
        return;
      }

      toast.success(t("trade.request.sentTitle"), {
        description: t("trade.request.sentDesc"),
      });
      await Promise.all([
        invalidateTrades(queryClient, user.id),
        queryClient.invalidateQueries({ queryKey: ["trade-exists", user.id, requestedItemId] }),
        // 相手の品の「申し込み済み」の印を更新する
        queryClient.invalidateQueries({ queryKey: ["trade-partner-offers", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["trade-partner-collection", user.id] }),
      ]);
      onClose();
    } catch (e) {
      console.error("Error sending trade request:", e);
      toast.error(t("common.error"), { description: t("trade.request.sendErrorDesc") });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            {t("trade.request.title")}
          </DialogTitle>
          <DialogDescription>
            {t("trade.request.stepTitleDirect", { title: requestedItemTitle })}
          </DialogDescription>
        </DialogHeader>

        {/* 何と何を交換するのか。もらう品（相手の）と、渡す品（いま選んでいる自分の）を並べる。
            以前はもらう品だけで、渡す品は下の一覧の枠でしか分からなかった */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5">
          <SummarySide
            label={
              partnerName
                ? t("trade.request.fromPartner", { name: partnerName })
                : t("trade.request.fromPartnerAnon")
            }
            image={requestedItemImage ?? null}
            title={requestedItemTitle}
          />
          <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <SummarySide
            label={t("trade.request.yourOffer")}
            image={selectedItem?.image ?? null}
            title={selectedItem?.title ?? t("trade.request.yourOfferEmpty")}
            empty={!selectedItem}
          />
        </div>
        {!partnerOffers && (
          <p className="rounded-lg bg-warning-soft p-2 text-2xs text-warning">
            {t("trade.request.consultNote")}
          </p>
        )}

        {alreadyRequested ? (
          <EmptyState
            className="py-8"
            icon={ArrowLeftRight}
            title={t("trade.request.alreadySentTitle")}
            description={t("trade.request.alreadySentDesc")}
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <Label className="text-sm">{t("trade.request.selectOfferLabel")}</Label>
                {/* 最初から選んであることを、一覧より先に伝える（下に置くと画面の外で気づかない） */}
                {selectedItem && selectedWanted && (
                  <p className="text-2xs text-muted-foreground">
                    {t("trade.request.preselectedNote", { title: selectedItem.title })}
                  </p>
                )}

                {isLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : myItems.length === 0 ? (
                  // 差し出せるグッズが1つも無い。まずコレクションに追加してもらう。
                  <EmptyState
                    className="py-6"
                    title={t("trade.request.noItemsTitle")}
                    description={t("trade.request.noItemsDesc")}
                    action={
                      <Button
                        size="sm"
                        onClick={() => {
                          onClose();
                          navigate("/collection");
                        }}
                      >
                        {t("trade.request.noTradableCta")}
                      </Button>
                    }
                  />
                ) : (
                  <>
                    {myItems.length > 9 && (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t("trade.request.searchPlaceholder")}
                          className="h-9 pl-8"
                        />
                      </div>
                    )}
                    {offerable.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t("trade.request.noMatchingItems")}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {offerable.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            aria-pressed={selectedItemId === item.id}
                            className={cn(
                              "relative rounded-lg border p-1.5 text-left transition-colors",
                              selectedItemId === item.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <div className="aspect-square overflow-hidden rounded-md bg-muted">
                              <img
                                src={getOptimizedImageUrl(item.image, { width: 200 })}
                                onError={fallbackToOriginal(item.image)}
                                loading="lazy"
                                decoding="async"
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            </div>
                            {item.wanted ? (
                              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-warning px-1.5 py-0.5 text-3xs font-bold text-warning-foreground">
                                <Gift className="h-2.5 w-2.5" />
                                {t("trade.request.wantedBadge")}
                              </span>
                            ) : item.for_trade ? (
                              <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-3xs font-bold text-primary-foreground">
                                {t("trade.request.offeringBadge")}
                              </span>
                            ) : null}
                            <p className="mt-1 line-clamp-2 min-h-[2rem] text-2xs">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedItem && !selectedItem.for_trade && (
                      <p className="text-2xs text-muted-foreground">{t("trade.request.notOfferingHint")}</p>
                    )}
                  </>
                )}
              </div>

              {myItems.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="trade-message" className="text-sm">
                    {t("trade.request.messageLabel")}
                  </Label>
                  <Textarea
                    id="trade-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("trade.request.messagePlaceholder")}
                    className="resize-none"
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            {t("trade.request.cancel")}
          </Button>
          {!alreadyRequested && myItems.length > 0 && (
            <Button onClick={send} disabled={!canSend}>
              {isSending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t("trade.request.send")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 申し込みの上部に置く、片側（もらう品／渡す品）の小さな見本 */
function SummarySide({
  label,
  image,
  title,
  empty = false,
}: {
  label: string;
  image: string | null;
  title: string;
  /** まだ選んでいない（渡す品）。写真の代わりに点線の枠を出す */
  empty?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 truncate text-2xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {empty || !image ? (
          <div className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-border bg-background" />
        ) : (
          <img
            src={getOptimizedImageUrl(image, { width: 96 })}
            onError={fallbackToOriginal(image)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg border bg-muted object-contain"
          />
        )}
        <p className={cn("line-clamp-2 text-xs leading-snug", empty ? "text-muted-foreground" : "font-medium")}>
          {title}
        </p>
      </div>
    </div>
  );
}
