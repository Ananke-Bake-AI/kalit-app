"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { BillingSummary } from "./billing-summary"

/**
 * Client-side billing summary fetcher.
 *
 * Before: the `/[locale]/(studio)/layout.tsx` server layout awaited
 * `getBillingSummary` which fired 4-6 Prisma reads against Neon in
 * `eu-central-1` from a Vercel function in `iad1` — ≈ 700 ms of
 * blocked SSR on every /studio navigation. Result: clicking the
 * Studio button felt like a 2 s freeze before any pixel changed.
 *
 * After: the layout does no DB work for billing. This provider
 * mounts inside the client `<StudioShell>` and fetches
 * `/api/billing/summary` after hydration. The Header credit badge
 * and the TrialBanner display a transient skeleton (≈ 100-300 ms on
 * a warm Vercel function, instant after the 30 s cached path is
 * reused) instead of holding the whole page hostage.
 *
 * The data itself is server-cached by `unstable_cache(billing:${orgId},
 * revalidate:30)` so multiple client-side fetches in the same window
 * (e.g. cross-tab nav, banner re-mount on focus mode toggle) collapse
 * to a single Neon round-trip.
 */
interface BillingSummaryContextValue {
  summary: BillingSummary | null
  loading: boolean
  /** Hard-refresh, bypassing the in-flight cache. Useful after
   *  Stripe checkout return (URL has ?checkout=success). */
  refresh: () => Promise<void>
}

const Ctx = createContext<BillingSummaryContextValue>({
  summary: null,
  loading: true,
  refresh: async () => {},
})

export interface BillingSummaryProviderProps {
  children: ReactNode
  /** Initial value from SSR if the layout still wants to opt-in.
   *  Pass null/undefined for pure client-side fetch. */
  initial?: BillingSummary | null
  /** Skip the fetch entirely — for anon visitors / no-org users. */
  enabled?: boolean
}

export function BillingSummaryProvider({
  children,
  initial = null,
  enabled = true,
}: BillingSummaryProviderProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(initial)
  // Only show "loading" when we have NO data to display. A revalidate
  // round-trip after the initial load shouldn't flicker the badge to
  // skeleton — the stale value is good enough until the new one lands.
  const [loading, setLoading] = useState<boolean>(initial == null && enabled)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await fetch("/api/billing/summary", { cache: "no-store" })
      if (!res.ok) {
        // 401 = no session (logged out mid-flight) → drop summary so
        // the header doesn't show stale credits.
        if (res.status === 401) setSummary(null)
        return
      }
      const data = (await res.json()) as { summary: BillingSummary | null }
      setSummary(data.summary ?? null)
    } catch {
      // Network error — keep whatever stale data we have, don't
      // collapse the badge. Next focus / refresh cycle retries.
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    // Skip initial fetch when we already got data from SSR — saves
    // one round-trip on first paint.
    if (initial != null) {
      setLoading(false)
      return
    }
    void refresh()
  }, [enabled, initial, refresh])

  return (
    <Ctx.Provider value={{ summary, loading, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBillingSummary(): BillingSummaryContextValue {
  return useContext(Ctx)
}
