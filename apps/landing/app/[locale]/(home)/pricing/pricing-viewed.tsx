"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer } from "@/lib/analytics/data-layer"

/**
 * Fires `pricing_viewed` once when the public /pricing page mounts. Distinct
 * from the generic `page_view` so the funnel has an explicit, high-intent
 * monetization signal to optimize ad campaigns on.
 */
export function PricingViewed() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    pushDataLayer("pricing_viewed", { page: "pricing" })
  }, [])
  return null
}
