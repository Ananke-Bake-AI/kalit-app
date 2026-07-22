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

  return postGa4(apiSecret, buildPayload(input), input.debug, "purchase")
}

/**
 * POST an assembled MP body to GA4's collect (or debug) endpoint. Shared by
 * the purchase path and the generic event path. Returns the parsed validation
 * response in debug mode, else void. Never throws.
 */
async function postGa4(
  apiSecret: string,
  body: Record<string, unknown>,
  debug: boolean | undefined,
  label: string,
): Promise<unknown> {
  const base = debug ? MP_DEBUG_URL : MP_COLLECT_URL
  const url = `${base}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    // The live collect endpoint returns 204 with no body; the debug endpoint
    // returns 200 with validationMessages.
    if (debug) return await res.json().catch(() => ({}))
    if (!res.ok && res.status !== 204) {
      const detail = await res.text().catch(() => "")
      console.error(`[ga4-mp] ${label} rejected (${res.status}): ${detail}`)
    }
  } catch (err) {
    console.error(`[ga4-mp] ${label} request failed:`, (err as Error).message)
  }
}

export interface Ga4EventInput {
  /** GA4 event name (e.g. "generation_succeeded"). */
  eventName: string
  /** client_id — real one from `_ga` when available, else a deterministic per-user id (see deterministicClientId). */
  clientId: string
  sessionId?: string | null
  /** GA4 user_id — the app user id, so events group per user even without the real cookie client_id. */
  userId?: string | null
  params?: Record<string, unknown>
  debug?: boolean
}

/**
 * Send an arbitrary GA4 event via the Measurement Protocol. Used for
 * backend-truth funnel events (e.g. the broker's generation lifecycle) that
 * the browser can't reliably fire. No-ops without the API secret or a
 * client_id; never throws. Returns validationMessages when `debug: true`.
 */
export async function sendGa4Event(input: Ga4EventInput): Promise<unknown> {
  const apiSecret = await getGa4MpApiSecret()
  if (!apiSecret) return
  if (!input.clientId) {
    console.warn(`[ga4-mp] skipped ${input.eventName} — no client_id`)
    return
  }
  const params: Record<string, unknown> = {
    engagement_time_msec: 100,
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
    ...(input.params || {}),
  }
  const body: Record<string, unknown> = {
    client_id: input.clientId,
    ...(input.userId ? { user_id: input.userId } : {}),
    events: [{ name: input.eventName, params }],
  }
  return postGa4(apiSecret, body, input.debug, input.eventName)
}

/**
 * A stable GA4 client_id derived from an app user/org id, for server-side
 * events fired when the real `_ga` cookie isn't in reach (e.g. the broker).
 * Format matches GA4's `<random>.<timestamp>` shape so MP accepts it; it groups
 * a user's events together but does NOT tie back to their original ad click
 * (that needs the real cookie client_id — a future refinement).
 */
export function deterministicClientId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  // Second field is a pseudo-timestamp seed derived from the id (no Date.now
  // so the same id always maps to the same client_id).
  const seed = 1000000000 + (h % 1000000000)
  return `${h}.${seed}`
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
