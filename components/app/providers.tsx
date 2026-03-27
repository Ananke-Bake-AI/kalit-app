"use client"

import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

import { AppThemeScope } from "./app-theme-scope"

export function Providers({
  children,
  session
}: {
  children: ReactNode
  /** Session lue côté serveur (`auth()`) pour hydrater le contexte sans attendre le fetch client */
  session: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <AppThemeScope>{children}</AppThemeScope>
    </SessionProvider>
  )
}
