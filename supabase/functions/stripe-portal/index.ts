// 課金の管理ページ（Stripe カスタマーポータル）を開く。
// プランの変更・解約・支払い方法の更新・領収書の確認は、ここで行ってもらう。

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { siteOrigin, stripeRequest, StripeNotConfigured } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "login_required" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) return json({ error: "login_required" }, 401);

  const admin = createClient(url, service);
  // 購読していなくても、ポイントを買った人は領収書の確認ができる
  const { data: row } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  const { data: sub } = row?.stripe_customer_id
    ? { data: null }
    : await admin.from("user_subscriptions").select("stripe_customer_id").eq("user_id", userRes.user.id).maybeSingle();
  const customerId: string | undefined = row?.stripe_customer_id ?? sub?.stripe_customer_id ?? undefined;
  if (!customerId) return json({ error: "no_stripe_customer" }, 404);

  try {
    const session = await stripeRequest("POST", "/billing_portal/sessions", {
      customer: customerId,
      return_url: `${siteOrigin(req)}/?checkout=portal`,
    });
    return json({ url: session.url });
  } catch (e) {
    if (e instanceof StripeNotConfigured) return json({ error: "stripe_not_configured" }, 503);
    console.error("stripe-portal failed:", e);
    return json({ error: "portal_failed" }, 500);
  }
});
