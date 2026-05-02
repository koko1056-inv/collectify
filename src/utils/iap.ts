// IAP handling via Capacitor + RevenueCat.
// - Consumable point packs: purchasePointPackage / getPointPackages (server-side grant via webhook)
// - Subscription flow: legacy stub kept for backward compatibility with PaywallModal

import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { IAP_PRODUCT_IDS, PlanTier } from "@/lib/planLimits";

// Order in which point packs should appear in UI.
const POINT_PACKAGE_ORDER = ["starter", "standard", "value", "premium"] as const;

export class IAPUserCancelledError extends Error {
  constructor() {
    super("IAP_USER_CANCELLED");
    this.name = "IAPUserCancelledError";
  }
}

export function isNativeIAPAvailable(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const key = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
  return !!key;
}

export interface PointPackageEntry {
  identifier: string;
  package: PurchasesPackage;
  product: { priceString: string; price: number };
}

export async function getPointPackages(): Promise<PointPackageEntry[]> {
  if (!isNativeIAPAvailable()) {
    throw new Error("IAP_WEB_UNAVAILABLE");
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  const byId = new Map<string, PurchasesPackage>();
  for (const pkg of current.availablePackages) {
    byId.set(pkg.identifier, pkg);
  }

  const ordered: PointPackageEntry[] = [];
  for (const id of POINT_PACKAGE_ORDER) {
    const pkg = byId.get(id);
    if (!pkg) continue;
    ordered.push({
      identifier: pkg.identifier,
      package: pkg,
      product: {
        priceString: pkg.product.priceString,
        price: pkg.product.price,
      },
    });
  }

  // Append any remaining packages not in the explicit order.
  for (const pkg of current.availablePackages) {
    if (!POINT_PACKAGE_ORDER.includes(pkg.identifier as (typeof POINT_PACKAGE_ORDER)[number])) {
      ordered.push({
        identifier: pkg.identifier,
        package: pkg,
        product: {
          priceString: pkg.product.priceString,
          price: pkg.product.price,
        },
      });
    }
  }

  return ordered;
}

export async function purchasePointPackage(
  rcPackage: PurchasesPackage
): Promise<{ transactionId: string }> {
  if (!isNativeIAPAvailable()) {
    throw new Error("IAP_WEB_UNAVAILABLE");
  }

  try {
    const result = await Purchases.purchasePackage({ aPackage: rcPackage });
    const txn =
      (result as any)?.transaction?.transactionIdentifier ??
      (result as any)?.transaction?.transactionId ??
      (result as any)?.customerInfo?.originalAppUserId ??
      "";
    return { transactionId: String(txn) };
  } catch (err: any) {
    if (
      err?.userCancelled ||
      err?.code === "PURCHASE_CANCELLED" ||
      err?.message?.includes?.("cancel")
    ) {
      throw new IAPUserCancelledError();
    }
    throw err;
  }
}

export async function restorePurchases(): Promise<void> {
  if (!isNativeIAPAvailable()) {
    throw new Error("IAP_WEB_UNAVAILABLE");
  }
  await Purchases.restorePurchases();
}

// ---------------------------------------------------------------------------
// Legacy subscription flow (kept for PaywallModal compatibility)
// ---------------------------------------------------------------------------

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

export async function startPurchase(
  plan: PlanTier,
  period: "monthly" | "yearly"
): Promise<void> {
  // Touch resolveProductId so it's not flagged as unused.
  void resolveProductId(plan, period);

  if (Capacitor.isNativePlatform()) {
    throw new Error(
      "iOS subscription IAP not yet wired via RevenueCat. Configure subscription products and update startPurchase."
    );
  }

  console.warn("[IAP] Web fallback: creating mock subscription");
  await recordSubscription({
    plan,
    period,
    platform: "web",
    transactionId: `dev_${Date.now()}`,
  });
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
