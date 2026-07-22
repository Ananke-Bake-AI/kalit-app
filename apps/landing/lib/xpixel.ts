/**
 * X (Twitter) Pixel bridge.
 *
 * History: X conversions used to rely ONLY on tags inside the GTM container
 * (GTM-WNSM869M). Those tags trigger on the PRE-taxonomy dataLayer event names
 * (`sign_up`, …), so the Jun 30 rename to canonical names silently killed them
 * — X Events Manager showed "GTM Sign up: no recent activity since 30 Jun".
 * The container is opaque from this repo, so the conversions that ads optimize
 * on are now fired code-side via `twq()` (loaded in app/layout.tsx, same
 * pattern as the Meta Pixel) where WE control the trigger.
 *
 * Split of ownership (avoid double-counting!):
 *   - Events listed in X_EVENT_IDS fire from code, HERE, and must NOT also
 *     have an active GTM tag triggering on the same canonical event name.
 *   - Engagement events whose GTM tags DO work (tool_viewed, pricing_viewed,
 *     signup_started, prompt_submitted, generation_started, input_submitted…)
 *     keep firing from the GTM container off the canonical dataLayer push.
 *
 * Event IDs come from X Events Manager (ads.x.com → Events manager → the
 * `</>` icon on an event). To wire a new conversion, add one line to
 * X_EVENT_IDS.
 */

export const X_PIXEL_ID = "rd3n8"

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void
  }
}

// Canonical internal event name → X conversion event ID.
const X_EVENT_IDS: Record<string, string> = {
  // Signup — the "Sign up" (Lead) event Christian set up in X Events Manager.
  signup_completed: "tw-rd3n8-13lm06",
  sign_up: "tw-rd3n8-13lm06", // legacy alias
  account_created: "tw-rd3n8-13lm06", // magnet
  // TODO(christian): purchase + checkout need their X event IDs to optimize
  // for sales — copy them from Events Manager (</> icon) and uncomment:
  // subscription_started: "tw-rd3n8-XXXXX", // Purchase
  // purchase_completed: "tw-rd3n8-XXXXX", // Purchase (credit packs)
  // checkout_started: "tw-rd3n8-XXXXX", // Begin checkout
}

/**
 * Mirror a canonical internal event to X when a conversion event ID is mapped.
 * Unmapped events are ignored — they reach X through the GTM container tags
 * that are still healthy.
 */
export function forwardEventToXPixel(event: string, params: Record<string, unknown>): void {
  const eventId = X_EVENT_IDS[event]
  if (!eventId) return
  if (typeof window === "undefined" || typeof window.twq !== "function") return

  // X only accepts its own parameter set; forward the ones we use.
  // `conversion_id` is X's dedup key — the same id fired twice counts once
  // (user id for signups, Stripe session id for purchases).
  const px: Record<string, unknown> = {}
  if (typeof params.value === "number") px.value = params.value
  if (typeof params.currency === "string") px.currency = params.currency
  const conversionId = params.conversion_id ?? params.eventID
  if (typeof conversionId === "string") px.conversion_id = conversionId
  if (typeof params.email_address === "string") px.email_address = params.email_address

  window.twq("event", eventId, px)
}
