import { useMemo } from "react";
import { AI_COSTS } from "@/lib/aiCosts";
import { discountedAiCost, PLAN_PERKS } from "@/lib/planLimits";
import { useSubscription } from "@/hooks/useSubscription";

type AiCostKey = keyof typeof AI_COSTS;

/**
 * いまのプランでの AI 生成の値段（pt）。サブスクの人は割引後の額（サーバーと同じ丸め）。
 * 正は各 Edge Function（_shared/subscription.ts）で、ここは画面に出すための写し。
 *
 *   const { costs, base, discountPercent } = useAiCosts();
 *   costs.aiRoom   // 100（無料）/ 80（プレミアム）/ 60（プレミアム+）
 */
export function useAiCosts() {
  const { plan } = useSubscription();
  return useMemo(() => {
    const costs = Object.fromEntries(
      (Object.keys(AI_COSTS) as AiCostKey[]).map((k) => [k, discountedAiCost(AI_COSTS[k], plan)])
    ) as Record<AiCostKey, number>;
    return { costs, base: AI_COSTS, plan, discountPercent: PLAN_PERKS[plan].aiDiscountPercent };
  }, [plan]);
}
