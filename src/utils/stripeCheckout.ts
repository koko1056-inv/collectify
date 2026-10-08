// Web での決済（Stripe Checkout）を始める。
//
// iOS / Android のアプリの中では使わない。アプリ内のデジタル商品は
// アプリ内課金（RevenueCat）で売る決まりで、外部決済へ誘導するとストアの規約に反する。
// 付与（プラン・ポイント）はこの画面ではなく、Stripe の通知を受ける stripe-webhook が行う。

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/planLimits";

export function isWebCheckoutAvailable(): boolean {
  return !Capacitor.isNativePlatform();
}

/** サーバーが返すエラーコード。画面側で文言を当てる */
export type CheckoutErrorCode =
  | "login_required"
  | "already_subscribed"
  | "subscribed_on_other_platform"
  | "invalid_plan"
  | "invalid_package"
  | "stripe_not_configured"
  | "no_stripe_customer"
  | "unknown";

export class CheckoutError extends Error {
  constructor(public code: CheckoutErrorCode) {
    super(code);
    this.name = "CheckoutError";
  }
}

const KNOWN_CODES: CheckoutErrorCode[] = [
  "login_required",
  "already_subscribed",
  "subscribed_on_other_platform",
  "invalid_plan",
  "invalid_package",
  "stripe_not_configured",
  "no_stripe_customer",
];

async function callForUrl(fn: "stripe-checkout" | "stripe-portal", body?: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  // 4xx/5xx のときも本文に { error: code } が入っているので、そこからコードを取り出す
  let code: string | undefined = (data as { error?: string } | null)?.error;
  if (error && !code) {
    try {
      const res = (error as { context?: Response }).context;
      if (res && typeof res.json === "function") code = (await res.json())?.error;
    } catch {
      /* 本文が読めなければ unknown */
    }
  }
  if (error || code) {
    console.error(`[${fn}] failed:`, code ?? error);
    throw new CheckoutError(KNOWN_CODES.includes(code as CheckoutErrorCode) ? (code as CheckoutErrorCode) : "unknown");
  }
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new CheckoutError("unknown");
  return url;
}

/** プレミアムの購読を始める。決済ページへ移動する（戻ってこない） */
export async function startSubscriptionCheckout(plan: PlanTier, period: "monthly" | "yearly"): Promise<void> {
  if (plan !== "premium" && plan !== "premium_plus") throw new CheckoutError("invalid_plan");
  const url = await callForUrl("stripe-checkout", { kind: "subscription", plan, period });
  window.location.assign(url);
}

/** ポイントパックを買う。packageKey は starter / standard / value / premium */
export async function startPointsCheckout(packageKey: string): Promise<void> {
  const url = await callForUrl("stripe-checkout", { kind: "points", package: packageKey });
  window.location.assign(url);
}

/** 課金の管理ページ（プラン変更・解約・支払い方法・領収書）を開く */
export async function openBillingPortal(): Promise<void> {
  const url = await callForUrl("stripe-portal");
  window.location.assign(url);
}
