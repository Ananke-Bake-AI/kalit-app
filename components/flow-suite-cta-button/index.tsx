"use client"

import { Button } from "@/components/button"
import { flowLoginHref } from "@/lib/flow-suite-entry"
import { useSession } from "next-auth/react"
import type { ReactNode } from "react"

export interface FlowSuiteCtaButtonProps {
  suiteAppUrl: string
  className?: string
  circle?: boolean
  variant?: "primary" | "secondary" | "tertiary"
  children: ReactNode
}

export function FlowSuiteCtaButton({
  suiteAppUrl,
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
          window.location.assign(suiteAppUrl.replace(/\/$/, ""))
        }}
      >
        {children}
      </Button>
    )
  }

  return (
    <Button className={className} circle={circle} variant={variant} href={flowLoginHref()}>
      {children}
    </Button>
  )
}

FlowSuiteCtaButton.displayName = "FlowSuiteCtaButton"
