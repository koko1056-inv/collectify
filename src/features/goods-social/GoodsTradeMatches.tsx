import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeRequestModal } from "@/components/trade/TradeRequestModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fallbackToOriginal, getAvatarImageUrl, getOptimizedImageUrl } from "@/utils/optimized-image";
import { useGoodsPeopleSummary, useGoodsTradeCandidates, type GoodsTradeCandidate } from "./useGoodsSocial";

interface GoodsTradeMatchesProps {
  itemId: string;
  itemTitle: string;
  itemImage?: string | null;
  className?: string;
}

/**
 * 「交換できるかも」。自分がほしい（ウィッシュリスト）ときは交換に出している人、
 * 自分が交換に出しているときはほしい人を出す。申し込みは、いつもの交換の申し込み画面（TradeRequestModal）でする。
 * 公式サンプルアカウントと実ユーザーはサーバー側で組まない。どちらでもない・相手がいないときは何も出さない。
 */
export function GoodsTradeMatches({ itemId, itemTitle, itemImage, className }: GoodsTradeMatchesProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: summary } = useGoodsPeopleSummary(itemId);
  // ほしい・交換に出しているときだけ探す（それ以外では相手が見つからないので、問い合わせも枠も出さない）
  const relevant = !!user && !!summary && (summary.me_wishes || summary.me_for_trade);
  const { data: candidates = [], isLoading } = useGoodsTradeCandidates(itemId, relevant);
  const [target, setTarget] = useState<GoodsTradeCandidate | null>(null);

  if (!relevant) return null;
  if (!isLoading && candidates.length === 0) return null;

  const hint = candidates.some((c) => c.direction === "want_from")
    ? t("goodsSocial.trade.wantFromHint")
    : t("goodsSocial.trade.offerToHint");

  return (
    <section
      className={cn("rounded-2xl border border-success/30 bg-success/5 p-3 motion-safe:animate-fade-in", className)}
      aria-labelledby={`goods-trade-${itemId}`}
      data-testid="goods-trade"
    >
      <h2 id={`goods-trade-${itemId}`} className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden="true"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </span>
        {t("goodsSocial.trade.title")}
      </h2>
      {isLoading ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-2xs text-muted-foreground">{hint}</p>
          <ul className="mt-2 space-y-1.5">
            {candidates.map((c) => (
              <CandidateRow key={`${c.direction}-${c.partner_id}`} c={c} onRequest={() => setTarget(c)} />
            ))}
          </ul>
          <p className="mt-2 text-3xs text-muted-foreground">{t("goodsSocial.trade.tradeNote")}</p>
        </>
      )}

      {target?.partner_item_id && (
        <TradeRequestModal
          isOpen
          onClose={() => setTarget(null)}
          requestedItemId={target.partner_item_id}
          requestedItemTitle={target.partner_item_title ?? itemTitle}
          requestedItemImage={target.partner_item_image ?? itemImage ?? null}
          partnerName={target.display_name || target.username}
          partnerOffers
          receiverId={target.partner_id}
          preselectedOfferedItemId={target.my_item_id}
        />
      )}
    </section>
  );
}

function CandidateRow({ c, onRequest }: { c: GoodsTradeCandidate; onRequest: () => void }) {
  const { t } = useLanguage();
  const name = c.display_name || c.username;
  const wantFrom = c.direction === "want_from";
  // offer_to のときは、相手が交換に出している品（申し込みで受け取る側）を小さく見せる
  const showTheirs = !wantFrom && !!c.partner_item_id;

  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-card px-2.5 py-2">
      <Link
        to={`/user/${c.partner_id}`}
        aria-label={t("goodsSocial.people.openProfile", { name })}
        className="flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={getAvatarImageUrl(c.avatar_url, 72)} onError={fallbackToOriginal(c.avatar_url)} alt="" />
          <AvatarFallback>{name ? name[0] : <UserRound className="h-4 w-4" />}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{name}</span>
          <span className="flex min-w-0 items-center gap-1 text-2xs text-muted-foreground">
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-px text-3xs font-bold",
                wantFrom ? "bg-success/15 text-success" : "bg-info/15 text-info",
              )}
            >
              {wantFrom ? t("goodsSocial.trade.wantFrom") : t("goodsSocial.trade.offerTo")}
            </span>
            {showTheirs && c.partner_item_title && <span className="truncate">⇄ {c.partner_item_title}</span>}
          </span>
        </span>
        {showTheirs && c.partner_item_image && (
          <img
            src={getOptimizedImageUrl(c.partner_item_image, { width: 96 })}
            onError={fallbackToOriginal(c.partner_item_image)}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted/30 object-contain"
          />
        )}
      </Link>
      {c.partner_item_id ? (
        <Button size="sm" className="h-8 shrink-0 rounded-full px-3" onClick={onRequest}>
          {wantFrom ? t("goodsSocial.trade.request") : t("goodsSocial.trade.consult")}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3" asChild>
          <Link to={`/user/${c.partner_id}`}>{t("goodsSocial.trade.seeProfile")}</Link>
        </Button>
      )}
    </li>
  );
}
