"use client"

import { Link } from "@/components/link"
import { createCheckoutSession, createCreditCheckoutSession } from "@/server/actions/billing"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Conversion-aware CTA for the public /pricing page.
 *
 * Behaviour matrix:
 *   logged-out  → <Link> to /register?plan={planKey}  (carries intent into signup)
 *   logged-in + free          → <Link> to /dashboard (no checkout, already free)
 *   logged-in + starter/pro   → <button> that opens Stripe Checkout via
 *                                createCheckoutSession (same flow as the
 *                                billing page's "Choose plan" buttons)
 *   logged-in + enterprise    → <Link> to /contact-us (no self-serve checkout)
 *
 * Keeps the marketing page reachable from anywhere — visitors and
 * signed-in users alike get the right next step without bouncing
 * through /register when they're already authenticated.
 */
interface PricingCtaProps {
  planKey: string
  label: string
  /** Used when the user isn't logged in. */
  signedOutHref: string
  className?: string
}

export function PricingCta({ planKey, label, signedOutHref, className }: PricingCtaProps) {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const loggedIn = status === "authenticated" && !!session?.user

  // Free + enterprise + signed-out users → static link, no checkout call.
  if (!loggedIn || planKey === "free" || planKey === "enterprise") {
    const href = !loggedIn
      ? signedOutHref
      : planKey === "free"
        ? "/dashboard"
        : "/contact-us"
    return <Link href={href} className={className}>{label}</Link>
  }

  const handleCheckout = async () => {
    setLoading(true)
    const result = await createCheckoutSession(planKey)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.url) {
      window.location.href = result.url
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? "Redirecting…" : label}
    </button>
  )
}

interface PricingPackCtaProps {
  packKey: string
  /** Pre-existing class chain from the pricing card. */
  className?: string
  /** Number of credits in the pack — only used in the button label. */
  credits: number
}

/**
 * Top-up pack CTA. Same logic as PricingCta but routes to the credit-
 * checkout server action. Signed-out users land on /register?plan=starter
 * because packs are only useful on top of a subscription.
 */
export function PricingPackCta({ packKey, className, credits }: PricingPackCtaProps) {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const loggedIn = status === "authenticated" && !!session?.user

  if (!loggedIn) {
    return (
      <Link href="/register?plan=starter" className={className}>
        Get started
      </Link>
    )
  }

  const handleBuy = async () => {
    setLoading(true)
    const result = await createCreditCheckoutSession(packKey)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.url) {
      window.location.href = result.url
    }
  }

  return (
    <button type="button" className={className} onClick={handleBuy} disabled={loading}>
      {loading ? "Redirecting…" : `Buy ${credits} credits`}
    </button>
  )
}
