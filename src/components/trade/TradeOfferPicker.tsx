import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Copy, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

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

  const rows = useMemo(() => {
    const all = items ?? [];
    const needle = filter.trim().toLowerCase();
    const matched = needle
      ? all.filter((row) => row.title.toLowerCase().includes(needle))
      : all;
    // ダブり → 交換中 → それ以外 の順。決めやすい順に並べる。
    return [...matched].sort((a, b) => {
      const aDup = a.quantity >= 2 ? 1 : 0;
      const bDup = b.quantity >= 2 ? 1 : 0;
      if (aDup !== bDup) return bDup - aDup;
      const aOn = (overrides[a.id] ?? a.for_trade) ? 1 : 0;
      const bOn = (overrides[b.id] ?? b.for_trade) ? 1 : 0;
      return bOn - aOn;
    });
  }, [items, filter, overrides]);

  const offerCount = rows.reduce(
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

    // マッチングと準備状況をすぐ描き替える。
    queryClient.invalidateQueries({ queryKey: ["trade-matches", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["trade-series-partners", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["trade-readiness", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["user-items"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            {t("trade.picker.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("trade.picker.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("trade.picker.filterPlaceholder")}
              className="pl-9"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("trade.picker.offerCount", { n: offerCount })}
          </p>
        </div>

        <ScrollArea className="max-h-[55vh] px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={ArrowLeftRight}
              title={t("trade.picker.empty")}
              description={t("trade.picker.emptyDesc")}
            />
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const on = overrides[row.id] ?? row.for_trade;
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                  >
                    <img
                      src={getOptimizedImageUrl(row.image, { width: 96 })}
                      onError={fallbackToOriginal(row.image)}
                      alt={row.title}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {row.quantity >= 2 && (
                          <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                            <Copy className="h-2.5 w-2.5" />
                            {t("trade.picker.duplicateBadge", { n: row.quantity })}
                          </Badge>
                        )}
                        {on && (
                          <span className="text-[10px] font-medium text-primary">
                            {t("trade.picker.offering")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-6 items-center gap-2">
                      {savingId === row.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={on}
                        disabled={savingId === row.id}
                        onCheckedChange={(next) => toggle(row, next)}
                        aria-label={t("trade.picker.toggleAria", { title: row.title })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
