"use client"

import { Button } from "@/components/button"
import {
  createCheckoutSession,
  createCreditCheckoutSession,
  createPortalSession,
  resumeSubscription,
  scheduleCancellation,
} from "@/server/actions/billing"
import { useTranslation } from "@/stores/i18n"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface CheckoutButtonProps {
  planKey: string
  label: string
  variant?: "primary" | "secondary" | "tertiary"
  disabled?: boolean
  className?: string
}

export function CheckoutButton({
  planKey,
  label,
  variant = "primary",
  disabled = false,
  className
}: CheckoutButtonProps) {
  const t = useTranslation()
  const [loading, setLoading] = useState(false)

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
    <Button className={className} onClick={handleCheckout} disabled={disabled || loading} variant={variant}>
      {loading ? t("settingsPages.redirecting") : label}
    </Button>
  )
}

interface ManageBillingButtonProps {
  label?: string
  variant?: "primary" | "secondary" | "tertiary"
  className?: string
}

export function ManageBillingButton({
  label,
  variant = "secondary",
  className
}: ManageBillingButtonProps) {
  const t = useTranslation()
  const [loading, setLoading] = useState(false)

  const handlePortal = async () => {
    setLoading(true)
    const result = await createPortalSession()
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
    <Button className={className} onClick={handlePortal} disabled={loading}>
      {loading ? t("settingsPages.loading") : (label || t("settingsPages.manageSubscription"))}
    </Button>
  )
}

interface CancelButtonProps {
  variant?: "primary" | "secondary" | "tertiary"
  className?: string
}

export function CancelSubscriptionButton({ variant = "tertiary", className }: CancelButtonProps) {
  const t = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    if (!window.confirm(t("settingsPages.cancelConfirm"))) return
    setLoading(true)
    const result = await scheduleCancellation()
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(t("settingsPages.cancelScheduled"))
    router.refresh()
  }

  return (
    <Button className={className} onClick={handleCancel} disabled={loading} variant={variant}>
      {loading ? t("settingsPages.loading") : t("settingsPages.cancelSubscription")}
    </Button>
  )
}

export function ResumeSubscriptionButton({ variant = "primary", className }: CancelButtonProps) {
  const t = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleResume = async () => {
    setLoading(true)
    const result = await resumeSubscription()
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(t("settingsPages.subscriptionResumed"))
    router.refresh()
  }

  return (
    <Button className={className} onClick={handleResume} disabled={loading} variant={variant}>
      {loading ? t("settingsPages.loading") : t("settingsPages.resumeSubscription")}
    </Button>
  )
}

interface BuyCreditsButtonProps {
  packKey: string
  label: string
  variant?: "primary" | "secondary" | "tertiary"
  disabled?: boolean
  className?: string
}

export function BuyCreditsButton({
  packKey,
  label,
  variant = "secondary",
  disabled = false,
  className,
}: BuyCreditsButtonProps) {
  const t = useTranslation()
  const [loading, setLoading] = useState(false)

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
    <Button className={className} onClick={handleBuy} disabled={disabled || loading} variant={variant}>
      {loading ? t("settingsPages.redirecting") : label}
    </Button>
  )
}
