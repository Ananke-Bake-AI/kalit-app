"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { pushDataLayer } from "@/lib/analytics/data-layer"

/**
 * Fires `purchase_completed` once when Stripe Checkout redirects back with
 * `?checkout=success` (subscription → /dashboard, credit pack →
 * /settings/billing). This is the revenue north-star for the lead-magnet
 * funnel; GTM/GA4 ties it back to the same client's earlier magnet events.
 *
 * Mounted in the (dashboard) layout, which covers both success destinations.
 */
export function CheckoutSuccessTracker() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (searchParams.get("checkout") !== "success") return
    firedRef.current = true
    const type = searchParams.get("type") || "subscription"
    const amount = searchParams.get("amount")
    pushDataLayer("purchase_completed", {
      type,
      ...(amount ? { credits: Number(amount) } : {}),
    })
  }, [searchParams, pathname])

  return null
}
