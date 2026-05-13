/**
 * Runtime resolver for marketing page strings. Loads the per-locale overrides
 * (auto-translated from EN by scripts/translate-page-strings.ts) and merges
 * them on top of EN so any missing key gracefully falls back to English.
 *
 * Usage:
 *   import { getPageStrings } from "@/lib/page-strings"
 *   const p = (await getPageStrings(locale)).pricing
 *
 * The merge is deep so individual keys inside `pricing.faqs[0]` etc. can be
 * partially translated without breaking other entries.
 */
import "server-only"
import { type Locale } from "@/lib/i18n"
import { EN_PAGE_STRINGS, type PageStrings } from "./en"

// Pre-baked JSON overrides per locale. Loaded statically so Next.js can tree
// shake the ones we don't ship. Missing JSONs are tolerated — the file may
// not exist yet for a freshly added locale.
import frJson from "./fr.json"
import esJson from "./es.json"
import deJson from "./de.json"
import ptJson from "./pt.json"
import jaJson from "./ja.json"
import itJson from "./it.json"
import nlJson from "./nl.json"
import koJson from "./ko.json"
import zhJson from "./zh.json"
import ruJson from "./ru.json"
import trJson from "./tr.json"
import plJson from "./pl.json"
import arJson from "./ar.json"
import hiJson from "./hi.json"
import svJson from "./sv.json"

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

const OVERRIDES: Record<string, DeepPartial<PageStrings>> = {
  fr: frJson as unknown as DeepPartial<PageStrings>,
  es: esJson as unknown as DeepPartial<PageStrings>,
  de: deJson as unknown as DeepPartial<PageStrings>,
  pt: ptJson as unknown as DeepPartial<PageStrings>,
  ja: jaJson as unknown as DeepPartial<PageStrings>,
  it: itJson as unknown as DeepPartial<PageStrings>,
  nl: nlJson as unknown as DeepPartial<PageStrings>,
  ko: koJson as unknown as DeepPartial<PageStrings>,
  zh: zhJson as unknown as DeepPartial<PageStrings>,
  ru: ruJson as unknown as DeepPartial<PageStrings>,
  tr: trJson as unknown as DeepPartial<PageStrings>,
  pl: plJson as unknown as DeepPartial<PageStrings>,
  ar: arJson as unknown as DeepPartial<PageStrings>,
  hi: hiJson as unknown as DeepPartial<PageStrings>,
  sv: svJson as unknown as DeepPartial<PageStrings>
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/** Deep merge where source values replace fallback ones; arrays are
 * replaced wholesale only if the source array is non-empty and the same
 * length (we treat ordered lists as positional). */
function deepMerge<T>(fallback: T, override: unknown): T {
  if (override === undefined || override === null) return fallback
  if (Array.isArray(fallback) && Array.isArray(override)) {
    // Position-preserving merge: keep fallback length, override item-by-item.
    const out = fallback.map((f, i) => {
      const o = override[i]
      if (o === undefined) return f
      if (isPlainObject(f) && isPlainObject(o)) return deepMerge(f, o)
      return o
    }) as unknown as T
    return out
  }
  if (isPlainObject(fallback) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...fallback }
    for (const k of Object.keys(override)) {
      out[k] = deepMerge((fallback as Record<string, unknown>)[k], override[k])
    }
    return out as T
  }
  // Primitives — prefer override unless it's empty string.
  if (typeof override === "string" && override === "") return fallback
  return override as T
}

export async function getPageStrings(locale: Locale): Promise<PageStrings> {
  if (locale === "en") return EN_PAGE_STRINGS
  const override = OVERRIDES[locale]
  if (!override || Object.keys(override).length === 0) return EN_PAGE_STRINGS
  return deepMerge(EN_PAGE_STRINGS, override)
}

export { EN_PAGE_STRINGS }
export type { PageStrings }
