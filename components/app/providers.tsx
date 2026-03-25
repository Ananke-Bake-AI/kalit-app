"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

import { AppThemeScope } from "./app-theme-scope"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppThemeScope>{children}</AppThemeScope>
    </SessionProvider>
  )
}
