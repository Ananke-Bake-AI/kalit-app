"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { pushDataLayer } from "@/lib/analytics/data-layer"

/**
 * Fires a synthetic `page_view` event on every Next.js client-side route
 * change. Necessary because the root-layout `gtag('config', G-...)` only
 * emits the initial page_view at first load — Next's SPA navigations (Link
 * clicks, router.push) don't trip a full page reload so GA4 (and any GTM
 * pageview-based tag) misses every subsequent page.
 *
 * Two sinks, because they read different structures off the shared dataLayer:
 *   - gtag('event','page_view', …) → GA4 (G-816EPS8GX8), loaded directly.
 *   - pushDataLayer('page_view', …) → GTM container (GTM-WNSM869M); GTM only
 *     reacts to `{ event }` objects, which the gtag arguments-array push is
 *     not. The first render is skipped for the GTM push because the GTM
 *     container already fires its own pageview on load — pushing again would
 *     double-count any custom `page_view`-triggered tag.
 *
 * Mount once in the root layout, below children.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const GA_ID = "G-816EPS8GX8"

export function GARouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRender = useRef(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const qs = searchParams?.toString()
    const page_path = qs ? `${pathname}?${qs}` : pathname
    const page_location = `${window.location.origin}${page_path}`
    const page_title = document.title

    // GA4 (direct gtag) — needs every SPA nav, including the first paint.
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path,
        page_location,
        page_title,
        send_to: GA_ID,
      })
    }

    // GTM — skip the first render (container fires its own load pageview).
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    pushDataLayer("page_view", { page_path, page_location, page_title })
  }, [pathname, searchParams])

  return null
}
