// サブスクのプランと、AI 生成の割引
//
// 正のプランは user_subscriptions（stripe-webhook の apply_stripe_subscription だけが書く）。
// アプリの表示（src/hooks/useSubscription.ts）と同じ決まりで「有効」を判断する:
//   status = 'active' かつ expires_at が無いか、まだ来ていない
// （past_due＝支払いのやり直し中も、Stripe が猶予しているあいだは status = 'active' のまま。
//   割引はその間も効く。毎月のポイントは DB 側で past_due のあいだは渡さない）
//
//   const plan = await activePlanFor(adminClient, user.id);
//   const cost = discountedAiCost(BASE_COST, plan);   // 100 → 80（プレミアム）/ 60（プレミアム+）
//
// 割合はアプリの表示（src/lib/planLimits.ts の PLAN_PERKS）と揃える。

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export type PlanTier = "free" | "premium" | "premium_plus";

/** AI 生成の割引（%）。プレミアム −20%、プレミアム+ −40% */
export const AI_DISCOUNT_PERCENT: Record<PlanTier, number> = {
  free: 0,
  premium: 20,
  premium_plus: 40,
};

/** いま有効なプラン。読めなかったとき・行が無いときは free（割引なし）にする */
export async function activePlanFor(admin: SupabaseClient, userId: string): Promise<PlanTier> {
  try {
    const { data, error } = await admin
      .from("user_subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return "free";
    if (data.status !== "active") return "free";
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return "free";
    return data.plan === "premium" || data.plan === "premium_plus" ? data.plan : "free";
  } catch (e) {
    console.error("activePlanFor failed:", e);
    return "free";
  }
}

/** 割引後の pt（整数に丸める）。例: 100 → 80 / 60、30 → 24 / 18、20 → 16 / 12 */
export function discountedAiCost(baseCost: number, plan: PlanTier): number {
  const pct = AI_DISCOUNT_PERCENT[plan] ?? 0;
  return Math.round((baseCost * (100 - pct)) / 100);
}

/** 履歴の説明に足す文字（割引のときだけ） */
export function discountNote(plan: PlanTier): string {
  const pct = AI_DISCOUNT_PERCENT[plan] ?? 0;
  if (pct <= 0) return "";
  return `（${plan === "premium_plus" ? "プレミアム+" : "プレミアム"} ${pct}%オフ）`;
}
