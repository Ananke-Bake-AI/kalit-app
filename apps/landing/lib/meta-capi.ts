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

/** Assemble Meta `user_data` from whatever match signals we have. */
function buildUserData(input: {
  email?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  clientUserAgent?: string | null
}): Record<string, unknown> {
  const userData: Record<string, unknown> = {}
  const em = hashEmail(input.email)
  if (em) userData.em = [em]
  if (input.fbp) userData.fbp = input.fbp
  if (input.fbc) userData.fbc = input.fbc
  if (input.clientIp) userData.client_ip_address = input.clientIp
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent
  return userData
}

/**
 * POST one assembled event object to the Graph API. Shared by the purchase
 * path and the generic server-event path. No-ops (returns false) when the CAPI
 * token isn't set; never throws.
 */
async function postMetaEvent(eventData: Record<string, unknown>): Promise<boolean> {
  const token = await getMetaCapiAccessToken()
  if (!token) return false // CAPI not configured.

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
      console.error(`[meta-capi] event "${eventData.event_name}" rejected (${res.status}): ${detail}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`[meta-capi] event "${eventData.event_name}" request failed:`, (err as Error).message)
    return false
  }
}

/**
 * Send a `Purchase` conversion to Meta CAPI. No-ops silently when the CAPI
 * token isn't set (feature simply off). Never throws — callers (the Stripe
 * webhook) must not fail a payment because a marketing pixel hiccuped.
 */
export async function sendMetaPurchaseEvent(input: MetaPurchaseInput): Promise<void> {
  const eventData: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: input.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId, // ← dedup pair with the browser Pixel
    action_source: "website",
    user_data: buildUserData(input),
    custom_data: {
      currency: (input.currency || "USD").toUpperCase(),
      ...(typeof input.value === "number" ? { value: input.value } : {}),
    },
  }
  if (input.eventSourceUrl) eventData.event_source_url = input.eventSourceUrl
  await postMetaEvent(eventData)
}

export interface MetaServerEventInput {
  /** Meta event name — a standard event (e.g. "Lead") or a custom one (e.g. "generation_succeeded"). */
  eventName: string
  /** Dedup key across sources, if any. Meta collapses matching (name, event_id) pairs. */
  eventId?: string
  email?: string | null
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  clientUserAgent?: string | null
  customData?: Record<string, unknown>
  eventSourceUrl?: string
  eventTimeSeconds?: number
  /**
   * Meta `action_source`. Defaults to "system_generated" — these come from our
   * backend (the Stripe/broker webhooks), not a live browser action. Callers
   * with a genuine web context can override to "website" (+ eventSourceUrl).
   */
  actionSource?: string
}

/**
 * Send an arbitrary server-side event to Meta CAPI (custom or standard). Used
 * for backend-truth funnel events the browser can't reliably fire (e.g. the
 * broker's generation lifecycle). No-ops without a token; never throws.
 */
export async function sendMetaEvent(input: MetaServerEventInput): Promise<void> {
  const userData = buildUserData(input)
  // Meta REQUIRES at least one customer-information parameter (hashed email,
  // _fbp/_fbc, IP, UA…). A server event with none is rejected 400 (subcode
  // 2804050 "no customer information parameters") — so don't even send it.
  // This happens for backend events whose user can't be resolved to an email
  // (orphan/anonymous sessions); GA4 still records them, Meta simply can't
  // match them to anyone, so there's nothing to gain from the call.
  if (Object.keys(userData).length === 0) {
    console.warn(`[meta-capi] skipped "${input.eventName}" — no match data (would 400)`)
    return
  }

  const eventData: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
    action_source: input.actionSource || "system_generated",
    user_data: userData,
    ...(input.eventId ? { event_id: input.eventId } : {}),
    ...(input.customData ? { custom_data: input.customData } : {}),
  }
  if (input.eventSourceUrl) eventData.event_source_url = input.eventSourceUrl
  await postMetaEvent(eventData)
}
