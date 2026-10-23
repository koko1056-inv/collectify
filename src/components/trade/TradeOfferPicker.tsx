import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { requestOnboardingRewardCheck } from "@/lib/onboardingRewards";
import { cn } from "@/lib/utils";
import { pockeCheer } from "@/components/pocke/pockeCheer";

/**
 * 交換に出すグッズをまとめて選ぶ。
 *
 * これまで for_trade を立てる経路は「グッズ詳細モーダルを開いて下までスクロール
 * してスイッチを探す」だけだった。本番の user_items 254件は全件 for_trade=false で、
 * 交換マッチングは構造的に1件も成立しない状態だった。
 * 一覧で並べて、その場で切り替えられる場所を作る。
 *
 * ダブり（所持数2個以上）を先頭に出す。「何か出してください」より
 * 「その2個目、出しませんか」のほうが手が動く。
 */

interface TradeOfferPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OfferRow {
  id: string;
  title: string;
  image: string;
  quantity: number;
  for_trade: boolean;
}

export function TradeOfferPicker({ open, onOpenChange }: TradeOfferPickerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  /** 楽観更新。保存を待ってから動かすとスイッチが固まって見える。 */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const { data: items, isLoading } = useQuery({
    queryKey: ["trade-offer-picker", user?.id],
    enabled: !!user?.id && open,
    queryFn: async (): Promise<OfferRow[]> => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, quantity, for_trade")
        .eq("user_id", user!.id)
        .order("quantity", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [onlyOffering, setOnlyOffering] = useState(false);

  const rows = useMemo(() => {
    const all = items ?? [];
    const needle = filter.trim().toLowerCase();
    let matched = needle ? all.filter((row) => row.title.toLowerCase().includes(needle)) : all;
    if (onlyOffering) matched = matched.filter((row) => overrides[row.id] ?? row.for_trade);
    // ダブりを先頭に。並びは切り替えても動かさない（押した場所からカードが逃げると、
    // 続けて選べなくなる）。取得時の並び（所持数→新しい順）のまま、ダブりだけ前へ。
    return [...matched].sort((a, b) => (b.quantity >= 2 ? 1 : 0) - (a.quantity >= 2 ? 1 : 0));
  }, [items, filter, overrides, onlyOffering]);

  const offerCount = (items ?? []).reduce(
    (n, row) => n + ((overrides[row.id] ?? row.for_trade) ? 1 : 0),
    0
  );

  const toggle = async (row: OfferRow, next: boolean) => {
    setOverrides((prev) => ({ ...prev, [row.id]: next }));
    setSavingId(row.id);
    const { error } = await supabase
      .from("user_items")
      .update({ for_trade: next })
      .eq("id", row.id);
    setSavingId(null);

    if (error) {
      console.error("Failed to toggle for_trade:", error);
      // 戻す。成功したように見えたまま保存されていない状態を残さない。
      setOverrides((prev) => {
        const copy = { ...prev };
        delete copy[row.id];
        return copy;
      });
      toast.error(t("itemDetails.trade.saveFailed"));
      return;
    }

    if (next) {
      // 「出したよ」はポッケが伝える。はじめてガイドの交換ステップの報酬は、
      // OnboardingRewardWatcher が確かめて付与・通知する（ここでは claim しない＝二重のやったね防止）。
      // ただし invalidate だけでは確認が走らないことがあるので、直接頼んで確実に確かめてもらう。
      pockeCheer("listedForTrade");
      // トーストから、出した直後にそのまま取り下げられるように（すぐ取り下げたい誤タップ対策）。
      // 「やったね」はポッケ側なので、ここは取り下げ CTA 付きの実用トーストだけ。
      toast(t("trade.picker.offeredToast", { title: row.title }), {
        action: { label: t("trade.picker.withdrawShort"), onClick: () => toggle(row, false) },
      });
      requestOnboardingRewardCheck();
    } else {
      pockeCheer("unlistedForTrade");
    }

    // マッチングと準備状況をすぐ描き替える。
    queryClient.invalidateQueries({ queryKey: ["trade-matches", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["trade-series-partners", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["trade-readiness", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["my-trade-offers", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["trade-post-give", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["user-items"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            {t("trade.picker.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("trade.picker.description")}
          </DialogDescription>
        </DialogHeader>

        {/* 出しているものを、この場で一発で取り下げられる帯。
            以前はここから下げるのに「もう一度探して、もう一度タップ」の手間が要った */}
        {offerCount > 0 && (
          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <p className="mb-1.5 text-2xs font-medium text-muted-foreground">
              {t("trade.picker.mineTitle", { n: offerCount })}
            </p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {(items ?? [])
                .filter((row) => overrides[row.id] ?? row.for_trade)
                .map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggle(row, false)}
                    disabled={savingId === row.id}
                    aria-label={t("trade.picker.withdrawAria", { title: row.title })}
                    title={t("trade.picker.withdrawAria", { title: row.title })}
                    className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background disabled:opacity-60"
                  >
                    <img
                      src={getOptimizedImageUrl(row.image, { width: 128 })}
                      onError={fallbackToOriginal(row.image)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-foreground/80 py-0.5 text-3xs font-bold text-background">
                      <X className="h-2.5 w-2.5" aria-hidden="true" />
                      {t("trade.picker.withdrawShort")}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("trade.picker.filterPlaceholder")}
              className="pl-9"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t("trade.picker.offerCount", { n: offerCount })}
            </p>
            <button
              type="button"
              aria-pressed={onlyOffering}
              onClick={() => setOnlyOffering((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                onlyOffering ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {t("trade.picker.onlyOffering")}
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[55vh] px-4 pb-4 [&>[data-radix-scroll-area-viewport]>div]:!block">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={ArrowLeftRight}
              title={onlyOffering ? t("trade.picker.noneOffering") : t("trade.picker.empty")}
              description={onlyOffering ? undefined : t("trade.picker.emptyDesc")}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2.5 pb-2 sm:grid-cols-4" data-tour="trade-offer-grid">
              {rows.map((row) => {
                const on = overrides[row.id] ?? row.for_trade;
                return (
                  <GoodsPickTile
                    key={row.id}
                    image={row.image}
                    title={row.title}
                    selected={on}
                    busy={savingId === row.id}
                    onClick={() => toggle(row, !on)}
                    ariaLabel={t("trade.picker.toggleAria", { title: row.title })}
                    corner={
                      row.quantity >= 2 ? (
                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-foreground/85 px-1.5 text-3xs font-bold tabular-nums text-background">
                          ×{row.quantity}
                        </span>
                      ) : undefined
                    }
                    footer={
                      <span
                        className={cn(
                          "mt-auto rounded-md py-1 text-center text-3xs font-bold",
                          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {on ? t("trade.picker.offering") : t("trade.picker.offer")}
                      </span>
                    }
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
