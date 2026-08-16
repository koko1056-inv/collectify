import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Clock,
  Flag,
  Loader2,
  MessageCircle,
  MoreVertical,
  Package,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { invalidateTrades } from "@/hooks/trade/useMyTrades";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import {
  cancelTradeRequest,
  reportTradeReceipt,
  reportTradeShipment,
  respondToTradeRequest,
  tradeErrorKey,
  type TradeActionResult,
} from "@/services/trade/tradeStateMachine";

import { TradeProgress } from "./TradeProgress";
import { ReportUserDialog } from "./ReportUserDialog";
import { isStalled, viewpointOf, type TradeRequest } from "./types";

interface TradeCardProps {
  trade: TradeRequest;
  onOpenChat?: (trade: TradeRequest) => void;
  /** 完了した取引で、相手を評価する導線 */
  onReview?: (trade: TradeRequest) => void;
}

/**
 * 取引1件のカード。
 *
 * ボタンは「いま自分が押せるもの」だけを出す。
 * 相手の発送を自分が代わりに報告することはできないし、
 * 相手が送ってくれるまで「受け取った」は押せない。
 * 押せない操作をグレーで並べるより、出さないほうが迷わない。
 */
export function TradeCard({ trade, onOpenChat, onReview }: TradeCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const view = viewpointOf(trade, user?.id);
  const partnerName =
    view.partner?.display_name || view.partner?.username || t("trade.match.userFallback");

  // 自分が差し出すもの / 受け取るもの。
  // offered_item は申し込んだ側の持ち物なので、立場で入れ替わる。
  const myItem = view.isSender ? trade.offered_item : trade.requested_item;
  const theirItem = view.isSender ? trade.requested_item : trade.offered_item;

  const run = async (key: string, action: () => Promise<TradeActionResult>, successKey?: string) => {
    setBusy(key);
    try {
      const result = await action();
      if (!result.ok) {
        const reason = "reason" in result ? result.reason : "unknown";
        toast.error(t("trade.errors.title"), { description: t(tradeErrorKey(reason)) });
        // 相手が先に動いていた場合は、こちらの表示が古い。取り直す。
        await invalidateTrades(queryClient, user?.id);
        return;
      }
      if (successKey) toast.success(t(successKey));
      await invalidateTrades(queryClient, user?.id);
    } finally {
      setBusy(null);
    }
  };

  const stalled = isStalled(trade) && !view.iShipped && !view.partnerShipped;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* 相手と状態 */}
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={view.partner?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {partnerName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{partnerName}</p>
          <StatusBadge trade={trade} />
        </div>

        {trade.status === "accepted" && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onOpenChat?.(trade)}
            aria-label={t("trade.card.openChat")}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}

        {view.partner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={t("trade.card.moreActions")}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsReportOpen(true)}>
                <Flag className="mr-2 h-3.5 w-3.5" />
                {t("trade.card.report")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 何と何を交換するのか */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <ItemSide label={t("trade.card.youGive")} item={myItem} />
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <ItemSide label={t("trade.card.youGet")} item={theirItem} />
      </div>

      {trade.message && (
        <p className="rounded-lg border-l-2 border-primary/40 bg-muted/50 p-2 text-xs">
          {trade.message}
        </p>
      )}

      {trade.status === "accepted" && <TradeProgress view={view} />}

      {stalled && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs">{t("trade.card.stalled")}</p>
        </div>
      )}

      {/* いま押せる操作 */}
      <div className="flex flex-wrap gap-2">
        {trade.status === "pending" && !view.isSender && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!!busy}
              onClick={() =>
                run("reject", () => respondToTradeRequest(trade.id, false), "trade.card.rejected")
              }
            >
              {busy === "reject" ? <Spinner /> : <X className="mr-1 h-3.5 w-3.5" />}
              {t("trade.card.reject")}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!!busy}
              onClick={() =>
                run("accept", () => respondToTradeRequest(trade.id, true), "trade.card.accepted")
              }
            >
              {busy === "accept" ? <Spinner /> : <Check className="mr-1 h-3.5 w-3.5" />}
              {t("trade.card.accept")}
            </Button>
          </>
        )}

        {trade.status === "pending" && view.isSender && (
          <>
            <p className="flex-1 self-center text-xs text-muted-foreground">
              {t("trade.card.waitingReply")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={!!busy}
              onClick={() =>
                run("cancel", () => cancelTradeRequest(trade.id), "trade.card.cancelled")
              }
            >
              {busy === "cancel" ? <Spinner /> : null}
              {t("trade.card.cancel")}
            </Button>
          </>
        )}

        {trade.status === "accepted" && !view.iShipped && (
          <Button
            size="sm"
            className="flex-1"
            disabled={!!busy}
            onClick={() =>
              run("ship", () => reportTradeShipment(trade.id), "trade.card.shipReported")
            }
          >
            {busy === "ship" ? <Spinner /> : <Package className="mr-1 h-3.5 w-3.5" />}
            {t("trade.card.reportShipped")}
          </Button>
        )}

        {trade.status === "accepted" && view.partnerShipped && !view.iReceived && (
          <Button
            size="sm"
            variant={view.iShipped ? "default" : "outline"}
            className="flex-1"
            disabled={!!busy}
            onClick={() =>
              run("receive", () => reportTradeReceipt(trade.id), "trade.card.receiveReported")
            }
          >
            {busy === "receive" ? <Spinner /> : <Truck className="mr-1 h-3.5 w-3.5" />}
            {t("trade.card.reportReceived")}
          </Button>
        )}

        {trade.status === "accepted" &&
          !view.iShipped &&
          !view.partnerShipped && (
            <Button
              variant="ghost"
              size="sm"
              disabled={!!busy}
              onClick={() =>
                run("cancel", () => cancelTradeRequest(trade.id), "trade.card.cancelled")
              }
            >
              {t("trade.card.cancel")}
            </Button>
          )}

        {trade.status === "completed" && onReview && view.partner && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onReview(trade)}>
            {t("trade.card.review")}
          </Button>
        )}
      </div>

      {view.partner && (
        <ReportUserDialog
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserId={view.partner.id}
          reportedUserName={partnerName}
          tradeRequestId={trade.id}
        />
      )}
    </div>
  );
}

function Spinner() {
  return <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />;
}

function ItemSide({
  label,
  item,
}: {
  label: string;
  item: { id: string; title: string; image: string };
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
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
    </div>
  );
}

function StatusBadge({ trade }: { trade: TradeRequest }) {
  const { t } = useLanguage();

  switch (trade.status) {
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          {t("trade.card.pending")}
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="secondary" className="text-xs">
          <ArrowLeftRight className="mr-1 h-3 w-3" />
          {t("trade.card.inProgress")}
        </Badge>
      );
    case "completed":
      return (
        <Badge className="text-xs">
          <Check className="mr-1 h-3 w-3" />
          {t("trade.card.completed")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="text-xs">
          {t("trade.card.rejectedBadge")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-xs">
          {t("trade.card.cancelledBadge")}
        </Badge>
      );
    default:
      return null;
  }
}
