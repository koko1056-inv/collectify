import { useNavigate } from "react-router-dom";
import { Heart, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useHoldersForMyWishes,
  useTradeReadiness,
  type WishHolder,
  type WishWithHolders,
} from "@/hooks/useTradeMatches";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

import { TradeSectionHeader } from "./TradeSectionHeader";

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
      <TradeSectionHeader icon={Heart} title={t("trade.holders.title")} description={t("trade.holders.desc")} />
      <CardContent className="space-y-4">
        {list.length === 0 ? (
          // 以前は約 330px の空状態で、交換画面の最初がほぼこれで埋まっていた。1行の案内に縮める
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <Heart className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {(readiness?.wishCount ?? 0) === 0 ? t("trade.holders.emptyNoWishTitle") : t("trade.holders.emptyTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {(readiness?.wishCount ?? 0) === 0 ? t("trade.holders.emptyNoWishDesc") : t("trade.holders.emptyDesc")}
              </p>
            </div>
            {(readiness?.wishCount ?? 0) === 0 && (
              <Button size="sm" className="shrink-0" onClick={() => navigate("/explore?tab=items")}>
                {t("trade.holders.findWishes")}
              </Button>
            )}
          </div>
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
          <p className="text-2xs text-muted-foreground">
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
                      <Badge className="h-4 px-1.5 text-3xs">{t("trade.holders.tradeOk")}</Badge>
                    ) : (
                      <span className="text-3xs text-muted-foreground">{t("trade.holders.notListed")}</span>
                    )}
                    {holder.trade_count > 0 && (
                      // 取引回数は評価ではないので、星などの飾りは付けず文字だけで出す
                      <span className="text-3xs text-muted-foreground">
                        {t("trade.holders.tradeCount", { n: holder.trade_count })}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {holder.busy ? (
                <span className="shrink-0 text-2xs text-muted-foreground">{t("trade.holders.busy")}</span>
              ) : holder.already_requested ? (
                <span className="shrink-0 text-2xs text-muted-foreground">{t("trade.holders.requested")}</span>
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
