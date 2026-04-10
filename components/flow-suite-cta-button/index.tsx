"use client"

import { Button } from "@/components/button"
import { FLOW_MARKETING_PATH } from "@/lib/flow-suite-entry"
import { suiteMarketingLoginHref } from "@/lib/suite-marketing-entry"
import { useSession } from "next-auth/react"
import { useState, type ReactNode } from "react"

export interface FlowSuiteCtaButtonProps {
  suiteAppUrl: string
  /** Page marketing pour le retour après login (ex. `/flow`, `/pentest`). */
  marketingPath?: string
  className?: string
  circle?: boolean
  variant?: "primary" | "secondary" | "tertiary"
  children: ReactNode
}

export function FlowSuiteCtaButton({
  suiteAppUrl,
  marketingPath = FLOW_MARKETING_PATH,
  className,
  circle,
  variant = "primary",
  children
}: FlowSuiteCtaButtonProps) {
  const { status } = useSession()
  const [launching, setLaunching] = useState(false)

  if (status === "loading") {
    return (
      <Button className={className} circle={circle} variant={variant} disabled>
        {children}
      </Button>
    )
  }

  if (status === "authenticated") {
    return (
      <Button
        className={className}
        circle={circle}
        variant={variant}
        type="button"
        disabled={launching}
        onClick={async () => {
          setLaunching(true)
          try {
            const res = await fetch("/api/suite/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ suiteId: "flow" }),
            })
            const data = await res.json()
            if (!res.ok || !data.redirectUrl) {
              // Fallback: navigate directly (user will land on login)
              window.location.assign(suiteAppUrl.replace(/\/$/, ""))
              return
            }
            let url = data.redirectUrl as string
            if (url.includes("localhost")) {
              const tokenMatch = url.match(/[?&]token=([^&]+)/)
              const token = tokenMatch ? tokenMatch[1] : ""
              url = `/api/suite/redirect?suiteId=flow&token=${token}`
            }
            window.location.href = url
          } catch {
            window.location.assign(suiteAppUrl.replace(/\/$/, ""))
          } finally {
            setLaunching(false)
          }
        }}
      >
        {children}
      </Button>
    )
  }

  return (
    <Button
      className={className}
      circle={circle}
      variant={variant}
      href={suiteMarketingLoginHref(marketingPath)}
    >
      {children}
    </Button>
  )
}

FlowSuiteCtaButton.displayName = "FlowSuiteCtaButton"
