/**
 * Geo-localized currency display for marketing + in-app pricing surfaces.
 *
 * Truth source for charging: Stripe (USD prices + Adaptive Pricing at
 * checkout). This module is presentation-only — it converts the USD
 * cent values we already have into the visitor's local currency for
 * the *landing* and *dashboard* UIs, so a European visitor sees
 * "~€27/mo" instead of "$29/mo".
 *
 * Detection: Cloudflare's CF-IPCountry header (set on every request
 * because kalit.ai sits behind CF). No client-side flash, no IP
 * lookup fee. Falls back to Accept-Language → US (USD) on localhost
 * / non-CF requests.
 *
 * FX rates: pulled daily from frankfurter.app (ECB-backed, free, no
 * API key, no rate limit for our volume). Cached via Next.js fetch
 * `revalidate: 86400` so we make at most one upstream call per day
 * per edge node.
 *
 * Source of disagreement note: Stripe Adaptive Pricing uses Stripe's
 * own FX rates, which include a ~2% spread vs. ECB mid-market. So
 * the price we show on the landing won't be byte-perfect with what
 * Stripe charges. We surface this via a small disclaimer under each
 * pricing grid ("Approximate local price — exact amount at
 * checkout") so we never look misleading.
 */

import "server-only"
import { headers } from "next/headers"
import countryToCurrency from "country-to-currency"

// Currencies we're comfortable displaying. Anything else falls back
// to USD so we don't accidentally show a currency we can't reliably
// convert / Stripe doesn't support well.
//
// Includes the major Stripe-supported settlement currencies + the
// big consumer markets. Add more as needed.
const SUPPORTED_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "SGD",
  "HKD",
  "BRL",
  "MXN",
  "INR",
  "IDR",
  "PHP",
  "THB",
  "MYR",
  "TRY",
  "ZAR",
  "AED",
  "SAR",
  "ILS",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "KRW",
  "TWD"
])

// Currencies that don't use minor units (no cents) — ¥1000 not ¥10.00.
// Used by the formatter to skip the /100 division.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "CLP", "BIF", "DJF"])

type FxMap = Record<string, number>

const FX_ENDPOINT = "https://api.frankfurter.app/latest?from=USD"

async function fetchFxRates(): Promise<FxMap> {
  try {
    const res = await fetch(FX_ENDPOINT, {
      // 24h cache — FX rates only matter to ~3 sig figs for marketing
      // copy, and a stale 1-day rate is far less harmful than a flaky
      // upstream blocking page render.
      next: { revalidate: 86400 }
    })
    if (!res.ok) return {}
    const json = (await res.json()) as { rates?: FxMap }
    return json.rates ?? {}
  } catch {
    // Network failure → silently fall back to USD (skip conversion).
    return {}
  }
}

/**
 * Smart rounding so we show "€27" not "€27.34" — psychological
 * pricing matters more than mid-market precision when the user knows
 * the charged amount will be different anyway. For zero-decimal
 * currencies (JPY/KRW) we round to the nearest 100.
 */
function prettyRound(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    // ¥2,847 → ¥2,800 ; ¥147 → ¥150
    if (amount >= 1000) return Math.round(amount / 100) * 100
    if (amount >= 100) return Math.round(amount / 10) * 10
    return Math.round(amount)
  }
  // < $1 keep cents; otherwise round to whole units to match the
  // pricing-page style ("€27" not "€27.34").
  if (amount < 1) return Math.round(amount * 100) / 100
  return Math.round(amount)
}

export interface PriceDisplay {
  /** Formatted, locale-appropriate string ("€27", "£23", "¥3,000"). */
  display: string
  /** ISO-4217 currency code actually used (after fallback). */
  currency: string
  /** True iff conversion happened (i.e. NOT USD source). Use this to
   * decide whether to show the FX disclaimer. */
  converted: boolean
  /** Numeric amount in major units (27, not 2700). */
  amount: number
}

interface PriceOptions {
  /** Override locale for Intl.NumberFormat (e.g. "fr-FR"). Defaults
   * to a locale paired with the detected currency. */
  locale?: string
}

/** Read the country code from CF-IPCountry; fall back to "US". */
async function detectCountry(): Promise<string> {
  const h = await headers()
  const cf = h.get("cf-ipcountry") || h.get("x-vercel-ip-country")
  if (cf && cf !== "XX" && cf !== "T1") return cf.toUpperCase()
  // Last resort: parse Accept-Language for a country tag (en-GB → GB).
  const al = h.get("accept-language") || ""
  const match = al.match(/[a-z]{2}-([A-Z]{2})/)
  if (match) return match[1]
  return "US"
}

/** Detect the visitor's preferred currency. Returns "USD" if we can't
 * map the country, or if the country's currency isn't in our
 * supported set. */
export async function detectCurrency(): Promise<string> {
  const country = await detectCountry()
  // country-to-currency is keyed by 2-letter country code.
  const raw = (countryToCurrency as Record<string, string>)[country]
  if (!raw) return "USD"
  if (!SUPPORTED_CURRENCIES.has(raw)) return "USD"
  return raw
}

/** Pair a currency code with a sensible BCP-47 locale for
 * Intl.NumberFormat (so "EUR" formats as "27 €" in fr-FR style). */
function localeForCurrency(currency: string): string {
  switch (currency) {
    case "EUR": return "fr-FR"
    case "GBP": return "en-GB"
    case "CHF": return "de-CH"
    case "CAD": return "en-CA"
    case "AUD": return "en-AU"
    case "NZD": return "en-NZ"
    case "JPY": return "ja-JP"
    case "SGD": return "en-SG"
    case "HKD": return "en-HK"
    case "BRL": return "pt-BR"
    case "MXN": return "es-MX"
    case "INR": return "en-IN"
    case "IDR": return "id-ID"
    case "PHP": return "en-PH"
    case "THB": return "th-TH"
    case "MYR": return "ms-MY"
    case "TRY": return "tr-TR"
    case "ZAR": return "en-ZA"
    case "AED": return "ar-AE"
    case "SAR": return "ar-SA"
    case "ILS": return "he-IL"
    case "NOK": return "nb-NO"
    case "SEK": return "sv-SE"
    case "DKK": return "da-DK"
    case "PLN": return "pl-PL"
    case "CZK": return "cs-CZ"
    case "HUF": return "hu-HU"
    case "RON": return "ro-RO"
    case "KRW": return "ko-KR"
    case "TWD": return "zh-TW"
    default: return "en-US"
  }
}

/**
 * Convert + format a USD cent amount into the visitor's local
 * currency. Returns the original USD if detection or FX fails — never
 * throws.
 */
export async function formatLocalizedPrice(
  usdCents: number,
  opts: PriceOptions = {}
): Promise<PriceDisplay> {
  const currency = await detectCurrency()
  const usdAmount = usdCents / 100
  if (currency === "USD") {
    return {
      display: formatAmount(usdAmount, "USD", opts.locale ?? "en-US"),
      currency: "USD",
      converted: false,
      amount: usdAmount
    }
  }
  const rates = await fetchFxRates()
  const rate = rates[currency]
  if (!rate) {
    // FX miss → fall back to USD rather than show a wrong number.
    return {
      display: formatAmount(usdAmount, "USD", opts.locale ?? "en-US"),
      currency: "USD",
      converted: false,
      amount: usdAmount
    }
  }
  const localAmount = prettyRound(usdAmount * rate, currency)
  return {
    display: formatAmount(localAmount, currency, opts.locale ?? localeForCurrency(currency)),
    currency,
    converted: true,
    amount: localAmount
  }
}

function formatAmount(amount: number, currency: string, locale: string): string {
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: zeroDecimal ? 0 : amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : amount % 1 === 0 ? 0 : 2
  }).format(amount)
}

/**
 * Batch-convert several USD prices in one detection pass. Used by
 * pricing pages that render N plan cards — we don't want N copies of
 * the same currency-detection work, just one detect + one rate
 * fetch.
 */
export async function formatLocalizedPrices(
  usdCentsList: number[],
  opts: PriceOptions = {}
): Promise<PriceDisplay[]> {
  const currency = await detectCurrency()
  if (currency === "USD") {
    return usdCentsList.map((cents) => {
      const usdAmount = cents / 100
      return {
        display: formatAmount(usdAmount, "USD", opts.locale ?? "en-US"),
        currency: "USD",
        converted: false,
        amount: usdAmount
      }
    })
  }
  const rates = await fetchFxRates()
  const rate = rates[currency]
  if (!rate) {
    return usdCentsList.map((cents) => {
      const usdAmount = cents / 100
      return {
        display: formatAmount(usdAmount, "USD", opts.locale ?? "en-US"),
        currency: "USD",
        converted: false,
        amount: usdAmount
      }
    })
  }
  const locale = opts.locale ?? localeForCurrency(currency)
  return usdCentsList.map((cents) => {
    const usdAmount = cents / 100
    const localAmount = prettyRound(usdAmount * rate, currency)
    return {
      display: formatAmount(localAmount, currency, locale),
      currency,
      converted: true,
      amount: localAmount
    }
  })
}
