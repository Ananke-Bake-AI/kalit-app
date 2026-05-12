"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Icon } from "@/components/icon"
import { useTranslation } from "@/stores/i18n"
import s from "./checkout-feedback.module.scss"

type Status = "success-sub" | "success-credits" | "canceled" | "error" | null

interface ResolvedFeedback {
  status: NonNullable<Status>
  icon: string
  iconKind: "success" | "warn" | "error"
  title: string
  body: string
}

/**
 * Reacts to the `?checkout=success` / `?checkout=canceled` (or `?checkout=error`)
 * query params that Stripe Checkout / our own billing actions tack on their
 * return URLs. Renders an inline result card (same visual language as the
 * verify-email screen — circular gradient icon, heading, body) at the top
 * of the dashboard / billing page so the user gets an obvious confirmation
 * the payment landed.
 *
 * On success we also schedule a `router.refresh()` ~2.5s later to pick up
 * the Subscription / CreditRecord rows our Stripe webhook writes (the
 * checkout return lands ahead of the `checkout.session.completed` event
 * by 1-3s).
 *
 * Strips the `checkout` param from the URL after capturing state so a
 * manual reload doesn't replay the card.
 */
export function CheckoutFeedback() {
  const t = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firedRef = useRef(false)
  const [feedback, setFeedback] = useState<ResolvedFeedback | null>(null)

  useEffect(() => {
    if (firedRef.current) return
    const checkout = searchParams.get("checkout")
    if (!checkout) return
    firedRef.current = true

    let resolved: ResolvedFeedback | null = null

    if (checkout === "success") {
      const type = searchParams.get("type")
      const amount = searchParams.get("amount")
      if (type === "credits" && amount) {
        resolved = {
          status: "success-credits",
          icon: "hugeicons:flash",
          iconKind: "success",
          title: t("dashboard.creditsAddedTitle", { amount }),
          body: t("dashboard.creditsAddedBody"),
        }
      } else {
        resolved = {
          status: "success-sub",
          icon: "hugeicons:checkmark-circle-03",
          iconKind: "success",
          title: t("dashboard.checkoutSuccessTitle"),
          body: t("dashboard.checkoutSuccessBody"),
        }
      }
    } else if (checkout === "canceled") {
      resolved = {
        status: "canceled",
        icon: "hugeicons:cancel-circle",
        iconKind: "warn",
        title: t("dashboard.checkoutCanceledTitle"),
        body: t("dashboard.checkoutCanceledBody"),
      }
    } else if (checkout === "error") {
      resolved = {
        status: "error",
        icon: "hugeicons:alert-02",
        iconKind: "error",
        title: t("dashboard.checkoutErrorTitle"),
        body: searchParams.get("message") || t("dashboard.checkoutErrorBody"),
      }
    }

    if (!resolved) return
    setFeedback(resolved)

    // Refresh server props for success cases so the new plan / credit count
    // appears alongside the card.
    let refreshHandle: number | null = null
    if (resolved.status.startsWith("success")) {
      refreshHandle = window.setTimeout(() => router.refresh(), 2500)
    }

    // Strip the `checkout` (and message) param so a manual reload doesn't
    // re-show the card. Keep `type` / `amount` — purely informational and
    // harmless if reloaded.
    const remaining = new URLSearchParams(searchParams)
    remaining.delete("checkout")
    remaining.delete("message")
    const qs = remaining.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })

    return () => {
      if (refreshHandle) window.clearTimeout(refreshHandle)
    }
  }, [searchParams, router, t, pathname])

  if (!feedback) return null

  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <div className={s.card}>
        <div className={`${s.icon} ${s[feedback.iconKind]}`}>
          <Icon icon={feedback.icon} />
        </div>
        <div className={s.copy}>
          <h2 className={s.title}>{feedback.title}</h2>
          <p className={s.body}>{feedback.body}</p>
        </div>
        <button
          type="button"
          className={s.dismiss}
          aria-label={t("common.dismiss")}
          onClick={() => setFeedback(null)}
        >
          <Icon icon="hugeicons:cancel-01" />
        </button>
      </div>
    </div>
  )
}
