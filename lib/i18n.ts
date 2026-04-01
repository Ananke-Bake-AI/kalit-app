export const LOCALES = ["en", "fr", "es", "de", "pt", "ja"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"
export const COOKIE_NAME = "kalit-locale"

export const LOCALE_CONFIG: Record<Locale, { label: string; flag: string; name: string }> = {
  en: { label: "EN", flag: "🇬🇧", name: "English" },
  fr: { label: "FR", flag: "🇫🇷", name: "Français" },
  es: { label: "ES", flag: "🇪🇸", name: "Español" },
  de: { label: "DE", flag: "🇩🇪", name: "Deutsch" },
  pt: { label: "PT", flag: "🇧🇷", name: "Português" },
  ja: { label: "JA", flag: "🇯🇵", name: "日本語" }
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale)
}

export function detectLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=")
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of languages) {
    const short = lang.slice(0, 2)
    if (isValidLocale(short)) return short
  }

  return DEFAULT_LOCALE
}

type Messages = Record<string, string | Record<string, string | Record<string, string>>>

const messageCache = new Map<Locale, Messages>()

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (messageCache.has(locale)) return messageCache.get(locale)!

  try {
    const messages = (await import(`@/messages/${locale}.json`)).default
    messageCache.set(locale, messages)
    return messages
  } catch {
    if (locale !== DEFAULT_LOCALE) {
      return loadMessages(DEFAULT_LOCALE)
    }
    return {}
  }
}

export function t(messages: Messages, key: string, params?: Record<string, string | number>): string {
  const keys = key.split(".")
  let value: unknown = messages

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key
    }
  }

  if (typeof value !== "string") return key

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
  }

  return value
}
