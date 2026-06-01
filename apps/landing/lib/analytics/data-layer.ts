/**
 * GTM dataLayer bridge.
 *
 * Kalit is a React SPA, so GTM's automatic Form-Submission / page triggers
 * never fire (forms use onSubmit+preventDefault / server actions / fetch;
 * navigations are client-side). GTM only ever sees the initial `gtm.js`
 * event from the inline snippet in `app/layout.tsx` — which is why social /
 * conversion tags inside the container report "no data".
 *
 * Calling `pushDataLayer("sign_up", …)` pushes a proper `{ event, … }` object
 * onto `window.dataLayer`, giving GTM real events to build triggers/tags on.
 *
 * NOTE: gtag() pushes an *arguments array* (`['event', …]`) onto the same
 * dataLayer — GTM does NOT treat those as triggerable events, so the gtag
 * page_view in GARouteTracker is invisible to GTM. This helper is the
 * GTM-facing path; the two coexist on the shared dataLayer global.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}
