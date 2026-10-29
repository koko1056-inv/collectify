import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_NAMES, type PlanTier } from "@/lib/planLimits";

/**
 * サブスクの毎月のポイントを受け取る係（App に1つ）。
 * 契約中の人がアプリを開いたら claim_subscription_points を1回呼ぶ。渡すかどうか・何か月分かはサーバーが決め、
 * 同じ月は2回渡らない（Webhook・毎日の cron と重なっても大丈夫）。無料の人には何もしない。
 */
export function SubscriptionPointsHost() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPremium, subscription } = useSubscription();
  const queryClient = useQueryClient();
  const claimedFor = useRef<string>("");

  useEffect(() => {
    if (!user?.id || !isPremium || !subscription) return;
    // 同じ購読・同じ期間の終わりのあいだは、このマウント中は1回だけ
    const key = `${user.id}:${subscription.id}:${subscription.expires_at ?? ""}`;
    if (claimedFor.current === key) return;
    claimedFor.current = key;

    (async () => {
      const { data, error } = await supabase.rpc("claim_subscription_points");
      if (error) {
        console.error("[SubscriptionPointsHost] claim failed", error);
        return;
      }
      const granted = (data as { granted_points?: number } | null)?.granted_points ?? 0;
      if (granted > 0) {
        toast.success(
          t("misc.premium.monthlyPointsClaimed", {
            plan: PLAN_NAMES[(subscription.plan as PlanTier) ?? "premium"] ?? PLAN_NAMES.premium,
            n: granted.toLocaleString(),
          })
        );
        queryClient.invalidateQueries({ queryKey: ["userPoints"] });
        queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      }
    })();
  }, [user?.id, isPremium, subscription, queryClient, t]);

  return null;
}
