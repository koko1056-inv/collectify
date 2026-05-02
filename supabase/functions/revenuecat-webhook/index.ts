import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// RevenueCat event types this function handles.
// All other types receive 200 OK and are silently ignored.
const HANDLED_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "NON_RENEWING_PURCHASE",
])

interface RevenueCatEvent {
  id: string                           // RevenueCat event ID
  type: string                         // e.g. "INITIAL_PURCHASE"
  app_user_id: string                  // maps to Supabase user UUID
  product_id: string                   // e.g. "com.collectify.points.starter"
  transaction_id?: string              // Apple transaction ID
  // RevenueCat may send price in different fields depending on SDK version
  price?: number
  price_in_purchased_currency?: number
}

interface RevenueCatWebhookBody {
  event: RevenueCatEvent
}

serve(async (req) => {
  // ── Verify shared secret ─────────────────────────────────────────────────
  const rcSecret = Deno.env.get("RC_WEBHOOK_SECRET")
  if (!rcSecret) {
    console.error("RC_WEBHOOK_SECRET env var is not set")
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  if (authHeader !== `Bearer ${rcSecret}`) {
    // Return 401 — RevenueCat will retry on non-2xx, but a bad secret
    // means retries will also fail, so this surfaces a config problem fast.
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: RevenueCatWebhookBody
  try {
    body = await req.json()
  } catch {
    // Malformed JSON — return 400 so RevenueCat does NOT retry
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const event = body?.event
  if (!event || typeof event !== "object") {
    return new Response(
      JSON.stringify({ error: "Missing event object" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Ignore unhandled event types ─────────────────────────────────────────
  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    console.log(`Ignoring event type: ${event.type}`)
    return new Response(
      JSON.stringify({ ignored: true, type: event.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Validate required fields ─────────────────────────────────────────────
  const missingFields: string[] = []
  if (!event.app_user_id)    missingFields.push("app_user_id")
  if (!event.product_id)     missingFields.push("product_id")
  if (!event.transaction_id) missingFields.push("transaction_id")
  if (!event.id)             missingFields.push("id")

  if (missingFields.length > 0) {
    // Return 400 — payload is structurally invalid; retrying won't fix it
    return new Response(
      JSON.stringify({ error: "Missing required fields", fields: missingFields }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Build service-role Supabase client ───────────────────────────────────
  const supabaseUrl    = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Call grant_points_from_iap RPC ───────────────────────────────────────
  const { data, error } = await supabase.rpc("grant_points_from_iap", {
    _user_id:     event.app_user_id,
    _apple_tx_id: event.transaction_id,
    _product_id:  event.product_id,
    _event_id:    event.id,
    _event:       body,           // full raw webhook payload stored as jsonb
  })

  if (error) {
    console.error("grant_points_from_iap RPC error:", error)
    // Return 500 so RevenueCat retries delivery
    return new Response(
      JSON.stringify({ error: "Failed to grant points", detail: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = data as {
    success: boolean
    duplicate?: boolean
    points_granted?: number
    new_balance?: number
    error?: string
  }

  if (!result.success) {
    // unknown_product — retrying will always fail, so return 422
    console.error("grant_points_from_iap returned failure:", result)
    return new Response(
      JSON.stringify({ error: result.error ?? "Grant failed", detail: result }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    )
  }

  if (result.duplicate) {
    console.log(`Duplicate transaction ignored: ${event.transaction_id}`)
  } else {
    console.log(
      `Points granted — user: ${event.app_user_id}, ` +
      `points: ${result.points_granted}, new_balance: ${result.new_balance}`
    )
  }

  return new Response(
    JSON.stringify({ ok: true, ...result }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
})
