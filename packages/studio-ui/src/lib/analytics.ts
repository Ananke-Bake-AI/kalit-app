/**
 * GTM dataLayer bridge for shared studio-ui components.
 *
 * The studio is a React SPA mounted inside the landing app (which loads GTM
 * container GTM-WNSM869M). GTM's automatic Form-Submission trigger never sees
 * the studio prompt forms — they're plain onClick/onSend handlers, not native
 * <form> submits — so without an explicit push the container gets no studio
 * events at all.
 *
 * Host-agnostic and safe: when no GTM/dataLayer is present (e.g. desktop or
 * mobile shells), the push is a no-op.
 */

interface DataLayerWindow {
  dataLayer?: Record<string, unknown>[]
}

export function pushDataLayer(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  const w = window as DataLayerWindow
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event, ...params })
}
