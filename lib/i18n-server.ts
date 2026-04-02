import { headers } from "next/headers"
import { DEFAULT_LOCALE, isValidLocale, loadMessages, localePath, t as translate, type Locale } from "./i18n"

export async function getServerLocale(): Promise<Locale> {
  const headerStore = await headers()
  const locale = headerStore.get("x-locale")
  if (locale && isValidLocale(locale)) return locale
  return DEFAULT_LOCALE
}

export async function getServerTranslation() {
  const locale = await getServerLocale()
  const messages = await loadMessages(locale)
  const t = (key: string, params?: Record<string, string | number>) => translate(messages, key, params)
  return { t, locale }
}

/** Builds a locale-prefixed path for use with redirect(). */
export async function localeHref(path: string): Promise<string> {
  const locale = await getServerLocale()
  return localePath(path, locale)
}
