"use client"

import { COOKIE_NAME, DEFAULT_LOCALE, t as translate, type Locale } from "@/lib/i18n"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

type Messages = Record<string, unknown>

interface I18nContextValue {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => key
})

export function I18nProvider({
  children,
  initialLocale,
  initialMessages
}: {
  children: React.ReactNode
  initialLocale: Locale
  initialMessages: Messages
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Messages>(initialMessages)

  // Sync state from server props when navigating between locales
  useEffect(() => {
    if (initialLocale !== locale) {
      setLocaleState(initialLocale)
      setMessages(initialMessages)
    }
  }, [initialLocale, initialMessages])

  // Keep cookie in sync so middleware can use it for root "/" redirect
  useEffect(() => {
    document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    document.documentElement.lang = locale
  }, [locale])

  const tFn = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(messages as never, key, params),
    [messages]
  )

  return (
    <I18nContext.Provider value={{ locale, t: tFn }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useTranslation() {
  const { t } = useContext(I18nContext)
  return t
}
