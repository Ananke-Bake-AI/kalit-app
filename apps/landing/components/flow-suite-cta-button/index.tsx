"use client"

import { Button } from "@/components/button"
import { FLOW_MARKETING_PATH } from "@/lib/flow-suite-entry"
import { suiteMarketingLoginHref } from "@/lib/suite-marketing-entry"
import type { SuiteId } from "@/lib/suites"
import { useSession } from "next-auth/react"
import type { ReactNode } from "react"

export interface FlowSuiteCtaButtonProps {
  suiteId: SuiteId
  suiteAppUrl: string
  /** Page marketing pour le retour après login (ex. `/flow`, `/pentest`). */
  marketingPath?: string
  className?: string
  circle?: boolean
  variant?: "primary" | "secondary" | "tertiary"
  children: ReactNode
}

export function FlowSuiteCtaButton({
  suiteId,
  marketingPath = FLOW_MARKETING_PATH,
  className,
  circle,
  variant = "primary",
  children
}: FlowSuiteCtaButtonProps) {
  const { status } = useSession()

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
        onClick={() => {
          // Synchronous top-level navigation in the click gesture. The server
          // GET route mints the suite token and 302-redirects into the suite's
          // SSO callback. The old approach fetched the token then navigated —
          // mobile Safari blocks navigations after an `await`, so the logged-in
          // button silently did nothing on mobile.
          window.location.href = `/api/suite/launch?suiteId=${suiteId}`
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
