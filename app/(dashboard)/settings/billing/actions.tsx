"use client"

import { Button } from "@/components/button"
import { createCheckoutSession, createPortalSession } from "@/server/actions/billing"
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
      {loading ? "Redirecting..." : label}
    </Button>
  )
}

interface ManageBillingButtonProps {
  label?: string
  variant?: "primary" | "secondary" | "tertiary"
  className?: string
}

export function ManageBillingButton({
  label = "Manage subscription",
  variant = "secondary",
  className
}: ManageBillingButtonProps) {
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
      {loading ? "Loading..." : label}
    </Button>
  )
}
