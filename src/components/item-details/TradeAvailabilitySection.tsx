import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToggleForTrade } from "@/hooks/trade/useToggleForTrade";

interface TradeAvailabilitySectionProps {
  itemId: string;
  quantity: number;
  forTrade: boolean;
}

/**
 * 「いくつ持っているか」と「そのうち1つを交換に出すか」をまとめて扱う。
 *
 * 個数が2つ以上でも自動で交換に出すことはしない。
 * 同じグッズを2つ持っていても、片方を人にあげたいとは限らないため、
 * 増えたときに声をかけるだけにして、決めるのは本人に委ねる。
 *
 * 交換の切り替えはコレクションのカードからもできるので、useToggleForTrade に寄せている。
 * forTrade は詳細のキャッシュから来ており、切り替えると楽観的に書き換わる。
 */
export function TradeAvailabilitySection({
  itemId,
  quantity,
  forTrade,
}: TradeAvailabilitySectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [isSaving, setIsSaving] = useState(false);
  const toggleTrade = useToggleForTrade();
  // 個数を増やした直後だけ出す一言。開いた瞬間から出ていると急かしているように見える
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-item-details", itemId] }),
      queryClient.invalidateQueries({ queryKey: ["user-items"] }),
      queryClient.invalidateQueries({ queryKey: ["trade-matches", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["trade-readiness", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["trade-series-partners", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["my-trade-offers", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", user?.id] }),
    ]);

  const save = async (patch: { quantity: number }) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_items").update(patch).eq("id", itemId);
      if (error) throw error;
      await refresh();
      return true;
    } catch (error) {
      console.error("Failed to update trade availability:", error);
      toast.error(t("itemDetails.trade.saveFailed"));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const changeQuantity = async (next: number) => {
    if (next < 1 || next === localQuantity) return;
    const previous = localQuantity;
    setLocalQuantity(next);

    const ok = await save({ quantity: next });
    if (!ok) {
      setLocalQuantity(previous);
      return;
    }

    // 2つ目が増えたときだけ、交換に出す選択肢があることを伝える
    if (next > previous && next >= 2 && !forTrade) {
      setShowNudge(true);
    }
    if (next < 2) {
      setShowNudge(false);
    }
  };

  const toggleForTrade = (next: boolean) => {
    setShowNudge(false);
    toggleTrade.mutate({ itemId, forTrade: next });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {t("itemDetails.trade.quantityLabel")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={isSaving || localQuantity <= 1}
            onClick={() => changeQuantity(localQuantity - 1)}
            aria-label={t("itemDetails.trade.decrease")}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-9 text-center text-sm font-bold tabular-nums">
            {localQuantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={isSaving}
            onClick={() => changeQuantity(localQuantity + 1)}
            aria-label={t("itemDetails.trade.increase")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium">{t("itemDetails.trade.switchLabel")}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("itemDetails.trade.switchHint")}
          </p>
        </div>
        <div className="flex h-6 items-center gap-2">
          {(isSaving || toggleTrade.isPending) && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={forTrade}
            disabled={isSaving || toggleTrade.isPending}
            onCheckedChange={toggleForTrade}
            aria-label={t("itemDetails.trade.switchLabel")}
          />
        </div>
      </div>

      {showNudge && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <p className="text-xs text-foreground">{t("itemDetails.trade.nudge")}</p>
          <Button
            size="sm"
            className="h-7 shrink-0 text-xs"
            disabled={isSaving || toggleTrade.isPending}
            onClick={() => toggleForTrade(true)}
          >
            {t("itemDetails.trade.nudgeCta")}
          </Button>
        </div>
      )}
    </div>
  );
}
