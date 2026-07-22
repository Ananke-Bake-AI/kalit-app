/**
 * Unified analytics dispatcher.
 *
 * Kalit is a React SPA, so GTM's automatic Form-Submission / page triggers
 * never fire (forms use onSubmit+preventDefault / server actions / fetch;
 * navigations are client-side). Relying on GTM's automatic triggers left most
 * of the funnel reporting "no data". So `pushDataLayer` is the ONE place every
 * funnel event flows through, and it fans out to every destination:
 *
 *   1. GTM dataLayer  — `window.dataLayer.push({ event, … })`. This is the feed
 *                       GTM builds tags on; the X *engagement* tags in the GTM
 *                       container (GTM-WNSM869M) trigger off these `{ event }`
 *                       objects.
 *   2. GA4            — `gtag('event', <name>, …)` directly, so every custom
 *                       event lands in GA4 without needing a matching GTM tag.
 *   3. Meta Pixel     — standard event when mapped, else trackCustom (fbpixel.ts).
 *   4. X Pixel        — code-side `twq()` for the mapped ad conversions
 *                       (xpixel.ts). The GTM-container X conversion tags still
 *                       listen for the pre-Jun-30 event names and are dead;
 *                       conversions X optimizes on must not depend on them.
 *
 * `<name>` is the canonical event name from the funnel taxonomy (the CMO spec).
 * Fire canonical names everywhere and the dashboards line up across GTM/X, GA4,
 * and Meta.
 *
 * NOTE: gtag() also pushes an *arguments array* onto the same dataLayer — GTM
 * does NOT treat those as triggerable events, so the GA4 path and the GTM path
 * coexist on the shared global without colliding.
 */

import { forwardEventToPixel } from "@/lib/fbpixel"
import { forwardEventToXPixel } from "@/lib/xpixel"

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    gtag?: (...args: unknown[]) => void
    /**
     * Bridge for host-agnostic packages (studio-ui). The landing app registers
     * its `pushDataLayer` here on mount so studio events route through this same
     * single fan-out (dataLayer/GTM + GA4 + Meta) instead of dataLayer-only.
     */
    __kalitTrack?: (event: string, params?: Record<string, unknown>) => void
  }
}

const GA_ID = "G-816EPS8GX8"

// page_view is fired to GA4 directly by GARouteTracker (it owns SPA pageviews),
// so don't double-fire it from here. landing_page_viewed is a distinct intent
// event and DOES go to GA4.
const GA_DIRECT_SKIP = new Set<string>(["page_view"])

export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return

  // 1) GTM dataLayer — feeds the container's tags (X pixel + conversions live
  //    here). Every event lands here with a clean `{ event, … }` shape.
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })

  // 2) GA4 — fire every event directly so it shows up without GTM tag wiring.
  if (!GA_DIRECT_SKIP.has(event) && typeof window.gtag === "function") {
    window.gtag("event", event, { ...params, send_to: GA_ID })
  }

  // 3) Meta Pixel — standard event when mapped, else custom event.
  forwardEventToPixel(event, params)

  // 4) X Pixel — conversion events with a mapped X event ID (signup, purchase…).
  forwardEventToXPixel(event, params)
}
