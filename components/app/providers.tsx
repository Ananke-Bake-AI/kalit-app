"use client"

import type { Locale } from "@/lib/i18n"
import { I18nProvider } from "@/stores/i18n"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

import { AppThemeScope } from "./app-theme-scope"

export function Providers({
  children,
  session,
  locale = "en",
  messages = {}
}: {
  children: ReactNode
  session: Session | null
  locale?: Locale
  messages?: Record<string, unknown>
}) {
  return (
    <SessionProvider session={session}>
      <I18nProvider initialLocale={locale} initialMessages={messages}>
        <AppThemeScope>{children}</AppThemeScope>
      </I18nProvider>
    </SessionProvider>
  )
}
