/**
 * GA4 Measurement Protocol — server-side `purchase` event.
 *
 * Companion to lib/meta-capi.ts. Fired from the Stripe webhook the moment a
 * subscription payment clears, straight to GA4 — no browser, so ad blockers /
 * iOS-ITP / a closed tab can't drop it. Because the GA4 property is linked to
 * Google Ads and `purchase` is imported as a conversion, this ALSO feeds
 * Google Ads' bidding (that's the whole point of Path A).
 *
 * NO double-count risk: the browser fires the custom `subscription_started`
 * event, NOT a standard GA4 `purchase`. So this server `purchase` is the only
 * one of its kind. (GA4 would additionally dedup by `transaction_id` if a
 * browser `purchase` ever appeared.)
 *
 * Attribution: GA4 ties a conversion to a Google Ads click via the user's GA4
 * session, which is keyed on the `client_id` from the `_ga` cookie (and the
 * `session_id` from the `_ga_<stream>` cookie). We capture both at
 * checkout-create time (billing.ts) and pass them here — no gclid handling
 * needed, GA4 already associated the click with that session client-side.
 *
 * Fails soft: no API secret, or a missing client_id, or an HTTP error → log
 * and return. Never throws into the webhook.
 */

import { getGa4MpApiSecret } from "./settings"

// Public GA4 Measurement ID (same one gtag/data-layer use). Not a secret.
export const GA4_MEASUREMENT_ID = "G-816EPS8GX8"

const MP_COLLECT_URL = "https://www.google-analytics.com/mp/collect"
// Debug endpoint validates the payload WITHOUT recording the event — used by
// the one-off verification script, never in the live webhook path.
const MP_DEBUG_URL = "https://www.google-analytics.com/debug/mp/collect"

export interface Ga4PurchaseInput {
  /** GA4 client_id, parsed from the `_ga` cookie (the last two dotted fields). */
  clientId: string
  /** GA4 session_id, parsed from the `_ga_<stream>` cookie (field index 2). Optional but improves attribution. */
  sessionId?: string | null
  /** Dedup / order key — the Stripe Checkout Session id (same key Meta uses). */
  transactionId: string
  value?: number
  currency?: string
  /** Optional line item label (e.g. the plan name) for GA4 ecommerce reports. */
  itemName?: string
  eventSourceUrl?: string
  /** When true, hit the /debug endpoint (validate only, do NOT record). */
  debug?: boolean
}

function buildPayload(input: Ga4PurchaseInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    transaction_id: input.transactionId,
    currency: (input.currency || "USD").toUpperCase(),
    // GA4 sessionizes server events; without these two the purchase can land
    // outside the user's session and lose Google Ads attribution.
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
    engagement_time_msec: 100,
  }
  if (typeof input.value === "number") {
    params.value = input.value
    params.items = [
      {
        item_name: input.itemName || "Subscription",
        price: input.value,
        quantity: 1,
      },
    ]
  }
  if (input.eventSourceUrl) params.page_location = input.eventSourceUrl

  return {
    client_id: input.clientId,
    // Non-personalized traffic still counts; we don't set user_id (no consent
    // plumbing for it here) — client_id is enough for Ads attribution.
    events: [{ name: "purchase", params }],
  }
}

/**
 * Send a GA4 `purchase`. No-ops when the MP API secret isn't configured or
 * there's no client_id to attribute to. Never throws.
 *
 * Returns the parsed validation response when `debug: true` (for the
 * verification script), otherwise void.
 */
export async function sendGa4Purchase(
  input: Ga4PurchaseInput,
): Promise<unknown> {
  const apiSecret = await getGa4MpApiSecret()
  if (!apiSecret) return // MP not configured — feature simply off.
  if (!input.clientId) {
    // No `_ga` cookie was present at checkout (e.g. cookies blocked) → GA4
    // couldn't attribute this anyway. Skip rather than send a junk client_id.
    console.warn("[ga4-mp] skipped purchase — no client_id")
    return
  }

  const base = input.debug ? MP_DEBUG_URL : MP_COLLECT_URL
  const url = `${base}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload(input)),
    })
    // The live collect endpoint returns 204 with no body; the debug endpoint
    // returns 200 with validationMessages.
    if (input.debug) {
      const json = await res.json().catch(() => ({}))
      return json
    }
    if (!res.ok && res.status !== 204) {
      const detail = await res.text().catch(() => "")
      console.error(`[ga4-mp] purchase rejected (${res.status}): ${detail}`)
    }
  } catch (err) {
    console.error("[ga4-mp] purchase request failed:", (err as Error).message)
  }
}

/**
 * Parse the GA4 client_id out of a raw `_ga` cookie value.
 * `_ga` looks like `GA1.1.1234567890.1680000000` → client_id is the last two
 * dotted fields: `1234567890.1680000000`. Returns null if unparseable.
 */
export function parseGaClientId(gaCookie?: string | null): string | null {
  if (!gaCookie) return null
  const parts = gaCookie.split(".")
  if (parts.length < 4) return null
  return parts.slice(-2).join(".")
}

/**
 * Parse the GA4 session_id from the stream-specific `_ga_<stream>` cookie.
 * Value looks like `GS1.1.<session_id>.<count>....` → field index 2.
 */
export function parseGaSessionId(gaStreamCookie?: string | null): string | null {
  if (!gaStreamCookie) return null
  const parts = gaStreamCookie.split(".")
  return parts[2] || null
}

/** The stream-specific cookie name GA4 uses, derived from the Measurement ID. */
export const GA4_STREAM_COOKIE = `_ga_${GA4_MEASUREMENT_ID.replace(/^G-/, "")}`
