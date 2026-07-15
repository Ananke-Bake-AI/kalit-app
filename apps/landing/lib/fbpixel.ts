/**
 * Meta (Facebook) Pixel bridge.
 *
 * The base pixel + initial PageView load from the inline snippet in
 * app/layout.tsx. SPA navigations fire PageView via FbPixelRouteTracker.
 *
 * Conversions are NOT instrumented per call-site: every conversion already
 * flows through `pushDataLayer` (sign_up, generate_lead, purchase_completed,
 * magnet events…), so `pushDataLayer` calls `forwardEventToPixel` once and we
 * map the internal event names to Meta standard events here. One place to edit.
 */

export const FB_PIXEL_ID = "2301820983555250"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function fbqTrack(
  event: string,
  params?: Record<string, unknown>,
  eventID?: string,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return
  // The 4th arg is Meta's options object; `eventID` there (NOT in params) is
  // the server↔browser dedup key. Passing it in params would send it as
  // custom data and would NOT dedup.
  const opts = eventID ? { eventID } : undefined
  const hasParams = params && Object.keys(params).length > 0
  if (hasParams && opts) window.fbq("track", event, params, opts)
  else if (hasParams) window.fbq("track", event, params)
  else if (opts) window.fbq("track", event, {}, opts)
  else window.fbq("track", event)
}

export function fbqTrackCustom(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return
  if (params && Object.keys(params).length) window.fbq("trackCustom", event, params)
  else window.fbq("trackCustom", event)
}

// Canonical internal event name → Meta STANDARD event.
//
// Anything NOT listed here still reaches Meta as a *custom* event
// (`trackCustom('<event>')`) — see forwardEventToPixel — so the full funnel
// taxonomy lands in Meta; this map just upgrades the ones Meta optimizes on to
// its standard events. Canonical names mirror the taxonomy in events.ts; the
// legacy aliases are kept so historical GTM tags / older call sites still map.
const STANDARD_EVENTS: Record<string, string> = {
  // Signup — a new account is created (register form, OAuth, or magnet).
  signup_completed: "CompleteRegistration",
  sign_up: "CompleteRegistration", // legacy alias
  account_created: "CompleteRegistration", // magnet
  // Trial activation — onboarding completed, 14-day trial granted.
  trial_started: "StartTrial",
  // Checkout opened (paywall → Stripe).
  checkout_started: "InitiateCheckout",
  upgrade_started: "InitiateCheckout", // legacy alias
  // Paid conversion — a subscription or credit pack completed (value+currency).
  subscription_started: "Purchase",
  purchase_completed: "Purchase", // legacy alias
  // Top-of-funnel intent.
  pricing_viewed: "ViewContent",
  app_preview_rendered: "ViewContent",
  // Leads.
  generate_lead: "Lead", // contact form
  claim_started: "Lead", // magnet claim
  brief_unlocked: "Lead" // magnet gated unlock
}

// Events we deliberately DON'T mirror to Meta (Meta already owns PageView via
// GTM, so firing these would double-count or add noise).
const PIXEL_SKIP = new Set<string>(["page_view", "landing_page_viewed"])

const DEFAULT_CURRENCY = "USD"

/**
 * Mirror a canonical internal event to Meta: a standard event when one is
 * mapped above, otherwise a custom event carrying the same name. This is why
 * EVERY funnel event shows up in Meta Events Manager.
 */
export function forwardEventToPixel(event: string, params: Record<string, unknown>): void {
  if (PIXEL_SKIP.has(event)) return

  const standard = STANDARD_EVENTS[event]

  if (!standard) {
    // No standard mapping → fire as a custom event so Meta still records it.
    fbqTrackCustom(event, params)
    return
  }

  if (standard === "Purchase") {
    const value = typeof params.value === "number" ? params.value : undefined
    const currency = typeof params.currency === "string" ? params.currency : DEFAULT_CURRENCY
    // `eventID` (when present) dedups this browser event against the server-side
    // CAPI Purchase fired from the Stripe webhook — both carry the Stripe
    // Checkout Session id. Kept out of custom data; passed as the fbq option.
    const eventID = typeof params.eventID === "string" ? params.eventID : undefined
    fbqTrack("Purchase", { currency, ...(value != null ? { value } : {}) }, eventID)
    return
  }

  if (standard === "StartTrial") {
    // Free 14-day trial — Meta expects a value/currency on StartTrial; 0 is fine.
    fbqTrack("StartTrial", { value: 0, currency: DEFAULT_CURRENCY })
    return
  }

  fbqTrack(standard, params)
}
