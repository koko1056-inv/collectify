// Stripe からの通知を受けて、ポイントの付与とプランの反映を行う。
// JWT は持たない呼び出し元（Stripe）なので verify_jwt = false。代わりに署名を必ず確かめる。
//
// 反映の方針
//  - ポイントパック: Checkout が支払い済み（paid）になったら、セッションIDで1回だけ付与する
//  - サブスク: 通知の中身は信用せず、そのつど Stripe から最新の状態を取り直して反映する。
//    通知は順番が入れ替わって届くことがあるため（updated が created より先、など）
//  - どの処理も冪等。再送されても二重に付与・反映しない

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { planFromLookupKey, stripeRequest, verifyStripeSignature } from "../_shared/stripe.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return json({ error: "server_misconfiguration" }, 500);
  }

  // 署名は生の本文に対して計算されているので、JSON にする前に読む
  const raw = await req.text();
  const ok = await verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret);
  if (!ok) return json({ error: "invalid_signature" }, 400);

  let event: { id: string; type: string; data: { object: any } };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    const { data: seen } = await admin.from("stripe_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (seen) return json({ ok: true, duplicate: true });

    const obj = event.data.object;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (obj.mode === "payment") {
          if (obj.payment_status !== "paid") break; // 非同期の支払いは、確定の通知を待つ
          const userId = obj.metadata?.user_id ?? obj.client_reference_id;
          const pkg = obj.metadata?.package;
          if (!userId || !pkg) {
            console.error("points session without user/package:", obj.id);
            return json({ ok: true, ignored: "missing_metadata" });
          }
          const { data, error } = await admin.rpc("grant_points_from_stripe", {
            _user_id: userId,
            _session_id: obj.id,
            _package_key: pkg,
            _payment_intent: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
            _amount_jpy: obj.amount_total ?? 0,
          });
          if (error) throw error;
          if (!data?.success) {
            // 付与できない理由（未知のパック・金額不足など）は再送しても直らない。記録して受け取る
            console.error("grant_points_from_stripe refused:", data);
            return json({ ok: true, refused: data });
          }
        } else if (obj.mode === "subscription" && obj.subscription) {
          await syncSubscription(admin, String(obj.subscription), obj.metadata?.user_id ?? obj.client_reference_id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(admin, String(obj.id), obj.metadata?.user_id);
        break;
      }

      default:
        // 関係のない通知は、受け取ったことだけ返す
        return json({ ok: true, ignored: event.type });
    }

    await admin.from("stripe_events").insert({ event_id: event.id, event_type: event.type });
    return json({ ok: true });
  } catch (e) {
    console.error("stripe-webhook failed:", event.type, e);
    // 500 を返すと Stripe が再送してくれる
    return json({ error: "processing_failed" }, 500);
  }
});

/** Stripe から購読の最新状態を取り、アプリ側のプランに反映する */
async function syncSubscription(admin: any, subscriptionId: string, userIdHint?: string | null) {
  const sub = await stripeRequest("GET", `/subscriptions/${subscriptionId}`, {});
  const item = sub.items?.data?.[0];
  const plan = planFromLookupKey(item?.price?.lookup_key) ?? sub.metadata?.plan ?? null;

  let userId: string | null = sub.metadata?.user_id ?? userIdHint ?? null;
  if (!userId) {
    const { data } = await admin.rpc("user_for_stripe_subscription", { _subscription_id: sub.id });
    userId = data ?? null;
  }
  if (!userId || !plan) {
    console.error("subscription without user/plan:", sub.id, { userId, plan });
    return;
  }

  // 新しい API バージョンでは期間の終わりが items 側にある
  const periodEndSec: number | undefined = sub.current_period_end ?? item?.current_period_end;
  const { data, error } = await admin.rpc("apply_stripe_subscription", {
    _user_id: userId,
    _plan: plan,
    _status: sub.status,
    _customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    _subscription_id: sub.id,
    _period_end: periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null,
    _cancel_at_period_end: sub.cancel_at_period_end === true,
  });
  if (error) throw error;
  if (!data?.success) console.error("apply_stripe_subscription refused:", data);
}
