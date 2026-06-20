"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * Fires a Meta Pixel `PageView` on every Next.js SPA navigation. The base
 * snippet in app/layout.tsx already fires the first PageView on load, so the
 * first render is skipped to avoid double-counting. Mirror of GARouteTracker.
 *
 * Mount once in the root layout (inside a Suspense — reads useSearchParams).
 */
export function FbPixelRouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView")
    }
  }, [pathname, searchParams])

  return null
}
