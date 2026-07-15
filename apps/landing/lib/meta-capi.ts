/**
 * Meta (Facebook) Conversions API — server-side purchase tracking.
 *
 * Why this exists: the browser Pixel already fires `Purchase` when Stripe
 * Checkout redirects back (see components/analytics/checkout-success-tracker.tsx),
 * but 10–30% of those browser events never reach Meta — ad blockers, iOS/ITP,
 * a closed tab before the redirect finishes. This sends the SAME purchase a
 * second time, server-side, straight from the Stripe webhook to Meta's Graph
 * API, carrying richer match data (hashed email + _fbp/_fbc + IP + UA).
 *
 * DEDUPLICATION — the important part: the server event and the browser event
 * carry the SAME `event_id` (the Stripe Checkout Session id). Meta collapses
 * matching (event_name, event_id) pairs into one conversion, so this NEVER
 * double-counts. If the browser event arrived, it wins; if it was blocked,
 * this one fills the gap.
 *
 * Fails soft: if the CAPI token isn't configured, or the Graph call errors,
 * we log and return — the browser Pixel path is unaffected either way.
 */

import { createHash } from "crypto"
import { FB_PIXEL_ID } from "./fbpixel"
import { getMetaCapiAccessToken, getMetaCapiTestCode } from "./settings"

// Pin the Graph API version so Meta can't shift payload semantics under us.
const GRAPH_API_VERSION = "v21.0"

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

// Meta requires PII normalized (trim + lowercase) then SHA-256 hex-hashed.
function hashEmail(email?: string | null): string | undefined {
  if (!email) return undefined
  const normalized = email.trim().toLowerCase()
  if (!normalized) return undefined
  return sha256Hex(normalized)
}

export interface MetaPurchaseInput {
  /** Dedup key — MUST equal the browser Pixel's eventID (the Stripe session id). */
  eventId: string
  value?: number
  currency?: string
  email?: string | null
  /** _fbp / _fbc first-party cookies captured at checkout-create time. */
  fbp?: string | null
  fbc?: string | null
  /** Client IP + UA captured at checkout time (the webhook's own IP is Stripe's — useless). */
  clientIp?: string | null
  clientUserAgent?: string | null
  eventSourceUrl?: string
  /** Unix seconds; defaults to now. Kept as a param so callers control it. */
  eventTimeSeconds?: number
}

/**
 * Send a `Purchase` conversion to Meta CAPI. No-ops silently when the CAPI
 * token isn't set (feature simply off). Never throws — callers (the Stripe
 * webhook) must not fail a payment because a marketing pixel hiccuped.
 */
export async function sendMetaPurchaseEvent(input: MetaPurchaseInput): Promise<void> {
  const token = await getMetaCapiAccessToken()
  if (!token) return // CAPI not configured — browser Pixel still covers the event.

  const userData: Record<string, unknown> = {}
  const em = hashEmail(input.email)
  if (em) userData.em = [em]
  if (input.fbp) userData.fbp = input.fbp
  if (input.fbc) userData.fbc = input.fbc
  if (input.clientIp) userData.client_ip_address = input.clientIp
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent

  const eventData: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: input.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId, // ← dedup pair with the browser Pixel
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency: (input.currency || "USD").toUpperCase(),
      ...(typeof input.value === "number" ? { value: input.value } : {}),
    },
  }
  if (input.eventSourceUrl) eventData.event_source_url = input.eventSourceUrl

  const payload: Record<string, unknown> = { data: [eventData] }
  const testCode = await getMetaCapiTestCode()
  if (testCode) payload.test_event_code = testCode

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${FB_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[meta-capi] Purchase event rejected (${res.status}): ${detail}`)
    }
  } catch (err) {
    console.error("[meta-capi] Purchase event request failed:", (err as Error).message)
  }
}
