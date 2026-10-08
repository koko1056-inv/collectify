import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Package, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradeRequestModal } from "@/components/trade/TradeRequestModal";
import { useAuth } from "@/contexts/AuthContext";
import { TrustBadge } from "@/features/trust/TrustBadge";
import { StampSendButton } from "@/features/stamps/StampSendButton";
import { useTrustScoresBulk } from "@/features/trust/useTrustScore";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemOwnersTabProps {
  officialItemId: string;
  onCloseModal?: () => void;
}

/**
 * 「持っている人」タブの内容（モーダル内に直接埋め込む版）。
 */
export function ItemOwnersTab({ officialItemId, onCloseModal }: ItemOwnersTabProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  // 交換を申請する相手
  const [tradeTarget, setTradeTarget] = useState<{
    userId: string;
    itemId: string;
    name: string | null;
    offers: boolean;
  } | null>(null);

  // 申請画面に出す、欲しい品の題名と写真
  const { data: officialItem } = useQuery({
    queryKey: ["official-item-brief", officialItemId],
    enabled: !!officialItemId && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("title, image")
        .eq("id", officialItemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: owners = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["item-owners-tab", officialItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(
          `id, user_id, quantity, for_trade,
           profiles ( id, username, avatar_url, display_name, bio )`
        )
        .eq("official_item_id", officialItemId);

      if (error) throw error;

      const map = new Map<string, any>();
      (data ?? []).forEach((item: any) => {
        const cur = map.get(item.user_id);
        const qty = (item.quantity || 1) + (cur?.quantity || 0);
        // 同じ人が複数持っているときは、交換に出している1点を申請の宛先にする
        const pickThis = !cur || (item.for_trade && !cur.for_trade);
        map.set(item.user_id, {
          user_id: item.user_id,
          quantity: qty,
          profile: item.profiles,
          item_id: pickThis ? item.id : cur.item_id,
          for_trade: !!(item.for_trade || cur?.for_trade),
        });
      });
      return Array.from(map.values()).sort((a, b) => {
        if (a.user_id === user?.id) return 1;
        if (b.user_id === user?.id) return -1;
        return b.quantity - a.quantity;
      });
    },
    enabled: !!officialItemId,
  });

  const ownerIds = owners.map((o) => o.user_id).filter((id) => id !== user?.id);
  const { data: trustMap } = useTrustScoresBulk(ownerIds);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 通信失敗を「持っている人がいない」と見せてしまわないよう区別する
  if (isError) {
    return (
      <QueryErrorState
        title={t("itemDetails.owners.loadFailed")}
        onRetry={() => refetch()}
        className="py-10"
      />
    );
  }

  if (owners.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("itemDetails.owners.empty")}
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1 mb-1">
        {t("itemDetails.owners.collectorsCount", { count: owners.length })}
      </p>
      {owners.map((owner) => {
        const isMe = owner.user_id === user?.id;
        const score = trustMap?.[owner.user_id];
        return (
          <div
            key={owner.user_id}
            className="flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                to={`/user/${owner.profile?.username || owner.user_id}`}
                onClick={onCloseModal}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={owner.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {owner.profile?.username?.charAt(0).toUpperCase() || (
                      <UserRound className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {owner.profile?.display_name || owner.profile?.username || t("itemDetails.common.user")}
                      {isMe && <span className="text-primary ml-1">{t("itemDetails.common.you")}</span>}
                    </p>
                    {!isMe && score && (
                      <TrustBadge score={score} size="xs" showLabel={false} />
                    )}
                  </div>
                  {owner.profile?.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {owner.profile.bio}
                    </p>
                  )}
                </div>
              </Link>
              <Badge variant="outline" className="flex-shrink-0">
                {t("itemDetails.owners.quantity", { count: owner.quantity })}
              </Badge>
            </div>
            {!isMe && user && (
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant={owner.for_trade ? "default" : "outline"}
                  className="gap-1"
                  onClick={() =>
                    setTradeTarget({
                      userId: owner.user_id,
                      itemId: owner.item_id,
                      name: owner.profile?.display_name || owner.profile?.username || null,
                      offers: !!owner.for_trade,
                    })
                  }
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {owner.for_trade ? t("trade.holders.request") : t("trade.holders.consult")}
                </Button>
                <StampSendButton
                  receiverId={owner.user_id}
                  contextType="item"
                  contextId={officialItemId}
                  size="sm"
                  label={t("itemDetails.common.greeting")}
                />
              </div>
            )}
          </div>
        );
      })}

      {tradeTarget && (
        <TradeRequestModal
          isOpen
          onClose={() => setTradeTarget(null)}
          requestedItemId={tradeTarget.itemId}
          requestedItemTitle={officialItem?.title ?? ""}
          requestedItemImage={officialItem?.image ?? null}
          partnerName={tradeTarget.name}
          partnerOffers={tradeTarget.offers}
          receiverId={tradeTarget.userId}
        />
      )}
    </div>
  );
}
