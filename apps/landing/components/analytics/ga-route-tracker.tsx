"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"

/**
 * Fires a synthetic `page_view` event into the gtag dataLayer on every
 * Next.js client-side route change. Necessary because the root-layout
 * `gtag('config', G-...)` only emits the initial page_view at first
 * load — Next's SPA navigations (Link clicks, router.push) don't trip
 * a full page reload so GA4 misses every subsequent page.
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return
    const qs = searchParams?.toString()
    const page_path = qs ? `${pathname}?${qs}` : pathname
    const page_location = `${window.location.origin}${page_path}`
    window.gtag("event", "page_view", {
      page_path,
      page_location,
      page_title: document.title,
      send_to: GA_ID,
    })
  }, [pathname, searchParams])

  return null
}
