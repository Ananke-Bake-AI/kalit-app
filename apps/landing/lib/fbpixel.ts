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

export function fbqTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return
  if (params && Object.keys(params).length) window.fbq("track", event, params)
  else window.fbq("track", event)
}

export function fbqTrackCustom(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return
  if (params && Object.keys(params).length) window.fbq("trackCustom", event, params)
  else window.fbq("trackCustom", event)
}

// Internal dataLayer event name → Meta standard event.
//
// The three campaign-optimization north-stars:
//   1. SIGNUP            sign_up / account_created → CompleteRegistration
//   2. TRIAL ACTIVATION  trial_started            → StartTrial
//   3. PURCHASE          purchase_completed       → Purchase (value + currency)
const STANDARD_EVENTS: Record<string, string> = {
  // 1) Signup — a new account is created (register form, OAuth, or magnet).
  sign_up: "CompleteRegistration",
  account_created: "CompleteRegistration",
  // 2) Trial activation — onboarding completed, 14-day trial granted.
  trial_started: "StartTrial",
  // 3) Purchase — a paid subscription or credit pack completed.
  purchase_completed: "Purchase",
  // Supporting funnel events.
  generate_lead: "Lead", // contact form
  claim_started: "Lead", // magnet claim
  brief_unlocked: "Lead", // magnet gated unlock
  upgrade_started: "InitiateCheckout" // checkout opened
}

const DEFAULT_CURRENCY = "USD"

/** Mirror an internal dataLayer event to its matching Meta standard event. */
export function forwardEventToPixel(event: string, params: Record<string, unknown>): void {
  const standard = STANDARD_EVENTS[event]
  if (!standard) return

  if (standard === "Purchase") {
    const value = typeof params.value === "number" ? params.value : undefined
    const currency = typeof params.currency === "string" ? params.currency : DEFAULT_CURRENCY
    fbqTrack("Purchase", { currency, ...(value != null ? { value } : {}) })
    return
  }

  if (standard === "StartTrial") {
    // Free 14-day trial — Meta expects a value/currency on StartTrial; 0 is fine.
    fbqTrack("StartTrial", { value: 0, currency: DEFAULT_CURRENCY })
    return
  }

  fbqTrack(standard)
}
