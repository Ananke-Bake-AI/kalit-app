/**
 * Magnet funnel events → GTM dataLayer.
 *
 * Wraps pushDataLayer so every magnet event carries door + slug + UTM, and
 * the north-stars (build_completed = activation, purchase_completed = paid)
 * report consistently in the same container (GTM-WNSM869M) as the main site.
 */
import { pushDataLayer } from "@/lib/analytics/data-layer"

export type MagnetEvent =
  | "tool_viewed"
  | "input_submitted"
  | "teaser_shown"
  | "result_shared"
  | "claim_started"
  | "account_created"
  | "build_started"
  | "build_completed"
  | "ship_clicked"
  | "paywall_shown"
  | "upgrade_started"
  | "purchase_completed"
  // idea-finder magnet
  | "scout_started"
  | "ideas_matched"
  | "idea_opened"
  | "brief_unlocked"
  | "flow_upsell_clicked"
  | "pentest_upsell_clicked"
  | "search_upsell_clicked"

export interface MagnetContext {
  door?: string
  slug?: string
}

const DEFAULTS: Required<MagnetContext> = {
  door: "roast_landing",
  slug: "roast-landing",
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const

export function captureUtm(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const qs = new URLSearchParams(window.location.search)
  const out: Record<string, string> = {}
  for (const k of UTM_KEYS) {
    const v = qs.get(k)
    if (v) out[k] = v
  }
  return out
}

export function magnetEvent(
  event: MagnetEvent,
  params: Record<string, unknown> = {},
  ctx: MagnetContext = {},
): void {
  pushDataLayer(event, {
    door: ctx.door ?? DEFAULTS.door,
    slug: ctx.slug ?? DEFAULTS.slug,
    ...captureUtm(),
    ...params,
  })
}
