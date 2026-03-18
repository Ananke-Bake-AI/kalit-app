"use client"

import { Button } from "@/components/button"
import { createCheckoutSession, createPortalSession } from "@/server/actions/billing"
import { useState } from "react"
import { toast } from "sonner"

interface BillingActionsProps {
  hasSubscription: boolean
}

export function BillingActions({ hasSubscription }: BillingActionsProps) {
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

  const handleCheckout = async (planKey: string) => {
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

  if (hasSubscription) {
    return (
      <Button variant="secondary" onClick={handlePortal} disabled={loading}>
        {loading ? "Loading..." : "Manage subscription"}
      </Button>
    )
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem" }}>
      <Button onClick={() => handleCheckout("starter")} disabled={loading} variant="secondary">
        Start with Starter
      </Button>
      <Button onClick={() => handleCheckout("pro")} disabled={loading}>
        Go Pro
      </Button>
    </div>
  )
}
