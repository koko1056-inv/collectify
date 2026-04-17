// iOS In-App Purchase handling via Capacitor
// NOTE: @revenuecat/purchases-capacitor is recommended for production.
// For now, we stub the flow and record the subscription in DB on confirmation.

import { supabase } from "@/integrations/supabase/client";
import { IAP_PRODUCT_IDS, PlanTier } from "@/lib/planLimits";

function resolveProductId(plan: PlanTier, period: "monthly" | "yearly"): string {
  if (plan === "premium") {
    return period === "monthly"
      ? IAP_PRODUCT_IDS.premium_monthly
      : IAP_PRODUCT_IDS.premium_yearly;
  }
  if (plan === "premium_plus") {
    return period === "monthly"
      ? IAP_PRODUCT_IDS.premium_plus_monthly
      : IAP_PRODUCT_IDS.premium_plus_yearly;
  }
  throw new Error("Invalid plan");
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function startPurchase(
  plan: PlanTier,
  period: "monthly" | "yearly"
): Promise<void> {
  const productId = resolveProductId(plan, period);

  if (isCapacitor()) {
    // Native iOS path
    await purchaseWithNativeIAP(productId, plan, period);
  } else {
    // Web/dev fallback: record as dev-mode subscription
    console.warn("[IAP] Web fallback: creating mock subscription");
    await recordSubscription({
      plan,
      period,
      platform: "web",
      transactionId: `dev_${Date.now()}`,
    });
  }
}

async function purchaseWithNativeIAP(
  productId: string,
  plan: PlanTier,
  period: "monthly" | "yearly"
): Promise<void> {
  // TODO: integrate @revenuecat/purchases-capacitor or cordova-plugin-purchase
  // Rough flow:
  //   const result = await Purchases.purchaseProduct(productId);
  //   await verifyReceipt(result.purchaseToken);
  //   await recordSubscription(...)

  // For now, throw to indicate the iOS build needs the plugin wired up.
  throw new Error(
    "iOS IAP plugin not yet wired. Install @revenuecat/purchases-capacitor to enable."
  );
}

export interface SubscriptionRecord {
  plan: PlanTier;
  period: "monthly" | "yearly";
  platform: "ios" | "android" | "web";
  transactionId: string;
}

export async function recordSubscription(rec: SubscriptionRecord): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const now = new Date();
  const expires = new Date(now);
  if (rec.period === "monthly") expires.setMonth(expires.getMonth() + 1);
  else expires.setFullYear(expires.getFullYear() + 1);

  const { error } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan: rec.plan,
        status: "active",
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        platform: rec.platform,
        transaction_id: rec.transactionId,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export async function cancelSubscription(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function restorePurchases(): Promise<void> {
  if (!isCapacitor()) {
    throw new Error("Restore is only available on iOS/Android");
  }
  // TODO: Purchases.restorePurchases() via RevenueCat
  throw new Error("Native restore not yet implemented");
}
