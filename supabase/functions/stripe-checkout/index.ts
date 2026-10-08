// Web 向けの決済（Stripe Checkout）を始める。
//   { kind: "subscription", plan: "premium" | "premium_plus", period: "monthly" | "yearly" }
//   { kind: "points", package: "starter" | "standard" | "value" | "premium" }
// 返すのは Stripe の決済ページの URL。支払いが済んだあとの反映（プラン・ポイント）は
// stripe-webhook が行う。ここでは何も付与しない。
//
// iOS / Android のアプリ内では、アプリ内課金（RevenueCat）を使うこと。デジタル商品を
// アプリ内から外部決済へ誘導するのはストアの規約に反する。

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { siteOrigin, stripeRequest, StripeNotConfigured } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PLANS = new Set(["premium", "premium_plus"]);
const PERIODS = new Set(["monthly", "yearly"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "login_required" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "login_required" }, 401);
  const user = userRes.user;
  const admin = createClient(url, service);

  let body: { kind?: string; plan?: string; period?: string; package?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  try {
    const origin = siteOrigin(req);
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("plan, status, platform, expires_at, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customer = sub?.stripe_customer_id ?? undefined;

    if (body.kind === "subscription") {
      if (!body.plan || !PLANS.has(body.plan) || !body.period || !PERIODS.has(body.period)) {
        return json({ error: "invalid_plan" }, 400);
      }
      // すでに有効なプランがあるときは、二重に課金しない
      const active = sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date());
      if (active && sub?.platform !== "web") return json({ error: "subscribed_on_other_platform" }, 409);
      if (active && sub?.stripe_subscription_id) return json({ error: "already_subscribed" }, 409);

      const lookupKey = `${body.plan}_${body.period}`;
      const prices = await stripeRequest("GET", "/prices", { "lookup_keys": [lookupKey], active: true, limit: 1 });
      const price = prices.data?.[0];
      if (!price) return json({ error: "price_not_found", lookup_key: lookupKey }, 500);

      const session = await stripeRequest("POST", "/checkout/sessions", {
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.id,
        customer,
        customer_email: customer ? undefined : user.email,
        locale: "ja",
        success_url: `${origin}/?checkout=success&kind=subscription`,
        cancel_url: `${origin}/?checkout=cancel&kind=subscription`,
        metadata: { user_id: user.id, kind: "subscription", plan: body.plan, period: body.period },
        subscription_data: { metadata: { user_id: user.id, plan: body.plan, period: body.period } },
      });
      return json({ url: session.url });
    }

    if (body.kind === "points") {
      const key = body.package ?? "";
      const { data: pkg } = await admin
        .from("point_packages")
        .select("revenuecat_package_id, price")
        .eq("revenuecat_package_id", key)
        .eq("is_active", true)
        .maybeSingle();
      if (!pkg) return json({ error: "invalid_package" }, 400);

      const lookupKey = `points_${key}`;
      const prices = await stripeRequest("GET", "/prices", { "lookup_keys": [lookupKey], active: true, limit: 1 });
      const price = prices.data?.[0];
      if (!price) return json({ error: "price_not_found", lookup_key: lookupKey }, 500);
      // アプリ側の定価と Stripe の価格がずれていたら売らない（付与側も定価未満は付与しない）
      if (price.unit_amount !== pkg.price) return json({ error: "price_mismatch" }, 500);

      const session = await stripeRequest("POST", "/checkout/sessions", {
        mode: "payment",
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: user.id,
        customer,
        customer_email: customer ? undefined : user.email,
        locale: "ja",
        success_url: `${origin}/point-shop?checkout=success&kind=points`,
        cancel_url: `${origin}/point-shop?checkout=cancel&kind=points`,
        metadata: { user_id: user.id, kind: "points", package: key },
      });
      return json({ url: session.url });
    }

    return json({ error: "invalid_kind" }, 400);
  } catch (e) {
    if (e instanceof StripeNotConfigured) {
      console.error("stripe-checkout:", e.message);
      return json({ error: "stripe_not_configured" }, 503);
    }
    console.error("stripe-checkout failed:", e);
    return json({ error: "checkout_failed" }, 500);
  }
});
