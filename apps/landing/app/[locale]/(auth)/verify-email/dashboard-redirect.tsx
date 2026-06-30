"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/button"
import { pushDataLayer } from "@/lib/analytics/data-layer"

export function DashboardRedirect() {
  // This component only renders in the verify-email "success" branch, so its
  // mount is a reliable signal that the email was just verified.
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    pushDataLayer("email_verified", {})
  }, [])

  return (
    <Button
      onClick={() => {
        // Hard navigation to force a full server render with the fresh JWT
        window.location.href = "/dashboard"
      }}
    >
      Go to dashboard
    </Button>
  )
}
