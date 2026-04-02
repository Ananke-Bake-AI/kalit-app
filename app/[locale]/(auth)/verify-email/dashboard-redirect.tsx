"use client"

import { Button } from "@/components/button"

export function DashboardRedirect() {
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
