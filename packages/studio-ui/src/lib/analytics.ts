/**
 * Analytics bridge for shared studio-ui components.
 *
 * The studio is a React SPA mounted inside the landing app (which loads GTM
 * container GTM-WNSM869M). GTM's automatic Form-Submission trigger never sees
 * the studio prompt forms — they're plain onClick/onSend handlers, not native
 * <form> submits — so without an explicit push the container gets no studio
 * events at all.
 *
 * When mounted inside the landing app, that app registers its unified
 * dispatcher on `window.__kalitTrack` (see components/analytics/analytics-bridge
 * .tsx). We delegate to it so studio events fan out across ALL destinations
 * (GTM/X + GA4 + Meta) through the same single mapping as landing events.
 *
 * Host-agnostic and safe: with no bridge present we still push to the
 * dataLayer (GTM), and with no dataLayer at all (desktop / mobile shells) the
 * push is a no-op.
 */

interface AnalyticsWindow {
  dataLayer?: Record<string, unknown>[]
  __kalitTrack?: (event: string, params?: Record<string, unknown>) => void
}

export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  const w = window as AnalyticsWindow

  // Preferred path: the host's unified dispatcher (also pushes to dataLayer),
  // so we don't double-push when it's present.
  if (typeof w.__kalitTrack === "function") {
    w.__kalitTrack(event, params)
    return
  }

  // Fallback: dataLayer-only (GTM) for hosts without the bridge.
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event, ...params })
}
