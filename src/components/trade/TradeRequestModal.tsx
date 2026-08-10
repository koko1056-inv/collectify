import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, Send } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { invalidateTrades } from "@/hooks/trade/useMyTrades";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface TradeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedItemId: string;
  requestedItemTitle: string;
  receiverId: string;
}

/**
 * 交換の申し込み。
 *
 * 差し出せるのは「交換に出す」を有効にしたグッズだけ。
 * 以前は持ち物を全部並べていたので、1つしかない大事なグッズを
 * うっかり差し出してしまえた。手放していいと決めたものだけを見せる。
 */
export function TradeRequestModal({
  isOpen,
  onClose,
  requestedItemId,
  requestedItemTitle,
  receiverId,
}: TradeRequestModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemId(null);
      setMessage("");
    }
  }, [isOpen]);

  const { data: offerable = [], isLoading } = useQuery({
    queryKey: ["tradable-items", user?.id],
    enabled: isOpen && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", user!.id)
        .eq("for_trade", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
    () => !!selectedItemId && !isSending && !alreadyRequested,
    [selectedItemId, isSending, alreadyRequested]
  );

  const send = async () => {
    if (!user || !selectedItemId) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from("trade_requests").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        offered_item_id: selectedItemId,
        requested_item_id: requestedItemId,
        message: message.trim() || null,
      });
      if (error) throw error;

      toast.success(t("trade.request.sentTitle"), {
        description: t("trade.request.sentDesc"),
      });
      await invalidateTrades(queryClient, user.id);
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

                {isLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : offerable.length === 0 ? (
                  // 交換に出しているものが無いと申し込めない。
                  // 「グッズがありません」で終わらせず、印の付け方まで案内する。
                  <EmptyState
                    className="py-6"
                    title={t("trade.request.noTradableTitle")}
                    description={t("trade.request.noTradableDesc")}
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
                  <div className="grid grid-cols-3 gap-2">
                    {offerable.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        aria-pressed={selectedItemId === item.id}
                        className={cn(
                          "rounded-lg border p-1.5 text-left transition-colors",
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
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 min-h-[2rem] text-[11px]">{item.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {offerable.length > 0 && (
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
          {!alreadyRequested && offerable.length > 0 && (
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
