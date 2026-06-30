"use client"

import { useEffect } from "react"
import { pushDataLayer } from "@/lib/analytics/data-layer"

/**
 * Exposes the landing app's unified `pushDataLayer` on `window.__kalitTrack`.
 *
 * The shared `studio-ui` package is host-agnostic — it can't import from the
 * landing app — so its own analytics helper falls back to dataLayer-only. By
 * registering the bridge here, studio events (prompt_submitted,
 * integration_connected, paywall_viewed, …) route through the SAME fan-out as
 * landing events (GTM/X + GA4 + Meta) instead of only reaching the dataLayer.
 *
 * Mount once in the root layout.
 */
export function AnalyticsBridge() {
  useEffect(() => {
    window.__kalitTrack = (event, params) => pushDataLayer(event, params)

    // Retention: one session_started per browser tab/session. sessionStorage
    // resets per tab session, so this fires once on the first page of a visit
    // (not on every SPA navigation).
    try {
      if (!sessionStorage.getItem("kalit_session_started")) {
        sessionStorage.setItem("kalit_session_started", "1")
        pushDataLayer("session_started", {})
      }
    } catch {
      /* sessionStorage unavailable (private mode / SSR) — skip */
    }

    return () => {
      if (window.__kalitTrack) delete window.__kalitTrack
    }
  }, [])

  return null
}
