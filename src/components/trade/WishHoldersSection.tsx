import { useNavigate } from "react-router-dom";
import { Heart, Send, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useHoldersForMyWishes,
  useTradeReadiness,
  type WishHolder,
  type WishWithHolders,
} from "@/hooks/useTradeMatches";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

export interface HolderRequestTarget {
  userId: string;
  itemId: string;
  itemTitle: string;
  itemImage: string | null;
  partnerName: string | null;
  partnerOffers: boolean;
}

/**
 * 欲しいものを持っている人。
 *
 * 自分の「欲しい」1つごとに、それを持っている人を並べて、その場で申請できる。
 * 交換に出している人を先に出し、出していない人にも「相談」として申請できる
 * （交換に出す人がまだ少ないうちは、出していない人しか見つからないため）。
 */
export function WishHoldersSection({
  onRequest,
}: {
  onRequest: (target: HolderRequestTarget) => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: wishes, isLoading } = useHoldersForMyWishes();
  const { data: readiness } = useTradeReadiness();

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const list = wishes ?? [];

  return (
    <Card data-tour="trade-holders">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-primary" />
          {t("trade.holders.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("trade.holders.desc")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={Heart}
            title={
              (readiness?.wishCount ?? 0) === 0
                ? t("trade.holders.emptyNoWishTitle")
                : t("trade.holders.emptyTitle")
            }
            description={
              (readiness?.wishCount ?? 0) === 0
                ? t("trade.holders.emptyNoWishDesc")
                : t("trade.holders.emptyDesc")
            }
            action={
              (readiness?.wishCount ?? 0) === 0 ? (
                <Button size="sm" onClick={() => navigate("/explore")}>
                  {t("trade.holders.findWishes")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          list.map((wish) => (
            <WishRow
              key={wish.wish_id}
              wish={wish}
              onRequest={(holder) =>
                onRequest({
                  userId: holder.user_id,
                  itemId: holder.user_item_id,
                  itemTitle: wish.title,
                  itemImage: wish.image,
                  partnerName: holder.display_name || holder.username,
                  partnerOffers: holder.for_trade,
                })
              }
              onOpenProfile={(userId) => navigate(`/user/${userId}`)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function WishRow({
  wish,
  onRequest,
  onOpenProfile,
}: {
  wish: WishWithHolders;
  onRequest: (holder: WishHolder) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-2.5">
      <div className="flex items-center gap-2.5">
        <img
          src={getOptimizedImageUrl(wish.image, { width: 120 })}
          onError={fallbackToOriginal(wish.image)}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-lg border bg-muted object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{wish.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("trade.holders.count", { total: wish.holder_count, ok: wish.trade_ok_count })}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {wish.holders.map((holder) => {
          const name = holder.display_name || holder.username || t("trade.match.userFallback");
          return (
            <li key={holder.user_item_id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenProfile(holder.user_id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-label={name}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={holder.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm">{name}</p>
                  <div className="flex items-center gap-1.5">
                    {holder.for_trade ? (
                      <Badge className="h-4 px-1.5 text-[10px]">{t("trade.holders.tradeOk")}</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{t("trade.holders.notListed")}</span>
                    )}
                    {holder.trade_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        {t("trade.holders.tradeCount", { n: holder.trade_count })}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {holder.busy ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">{t("trade.holders.busy")}</span>
              ) : holder.already_requested ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">{t("trade.holders.requested")}</span>
              ) : (
                <Button
                  size="sm"
                  variant={holder.for_trade ? "default" : "outline"}
                  className="h-8 shrink-0 gap-1 px-3 text-xs"
                  onClick={() => onRequest(holder)}
                >
                  <Send className="h-3 w-3" />
                  {holder.for_trade ? t("trade.holders.request") : t("trade.holders.consult")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
