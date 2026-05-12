"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { useTranslation } from "@/stores/i18n"

/**
 * Reacts to the `?checkout=success` / `?checkout=canceled` query params that
 * Stripe Checkout tacks on its return URL. Shows a toast and — for the
 * success case — schedules a `router.refresh()` ~2.5s later to pick up the
 * Subscription row written by our webhook handler (the checkout return
 * lands ahead of the `checkout.session.completed` event by 1-3s, so on
 * initial render the dashboard still sees the org as "Free").
 *
 * Strips the param from the URL after firing so a manual refresh doesn't
 * re-trigger the toast.
 */
export function CheckoutFeedback() {
  const t = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const checkout = searchParams.get("checkout")
    if (checkout !== "success" && checkout !== "canceled") return
    firedRef.current = true

    if (checkout === "success") {
      const type = searchParams.get("type")
      const amount = searchParams.get("amount")
      if (type === "credits" && amount) {
        toast.success(t("dashboard.creditsAddedTitle", { amount }), {
          description: t("dashboard.creditsAddedBody"),
          duration: 6000,
        })
      } else {
        toast.success(t("dashboard.checkoutSuccessTitle"), {
          description: t("dashboard.checkoutSuccessBody"),
          duration: 6000,
        })
      }
      // Wait for the Stripe webhook to land before refetching server props,
      // otherwise the plan stat / credit count still reads the pre-purchase
      // value and the user thinks nothing happened.
      const handle = window.setTimeout(() => router.refresh(), 2500)
      cleanUrl()
      return () => window.clearTimeout(handle)
    }

    toast.info(t("dashboard.checkoutCanceled"), { duration: 5000 })
    cleanUrl()
  }, [searchParams, router, t, pathname])

  function cleanUrl() {
    const remaining = new URLSearchParams(searchParams)
    remaining.delete("checkout")
    const qs = remaining.toString()
    const next = qs ? `${pathname}?${qs}` : pathname
    router.replace(next, { scroll: false })
  }

  return null
}
