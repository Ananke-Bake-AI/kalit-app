import { unstable_cache, revalidateTag } from "next/cache"
import { prisma } from "./prisma"
import { getCreditBreakdownWithEntitlements, resolveEntitlements } from "./entitlements"
import { getPlan } from "./plans"

/**
 * Compact billing summary surfaced in the global header (and trial
 * banner). The point is to give every authenticated page a single
 * call that yields everything we need to decide what to render —
 * plan name, monthly + extra credit pools, trial state — without
 * each layout fetching the same rows twice.
 *
 * Returns null when the user has no org yet (mid-setup) or no
 * session — callers should branch on that.
 *
 * **Caching**: wrapped in `unstable_cache` with 30 s TTL and a
 * per-org tag (`billing:${orgId}`). At 30 s the credit badge is
 * fresh enough for the global header without making /studio
 * navigation do 4-6 transatlantic Prisma reads on every click. State
 * changes that need immediate refresh (Stripe checkout completion,
 * Stripe webhook, admin grant) call `invalidateBillingSummary(orgId)`
 * to wipe that org's cache entry.
 */
export interface BillingSummary {
  planKey: string                // "free" | "starter" | "pro" | "enterprise"
  planName: string               // display label
  isPaid: boolean                // any paid Stripe sub active
  isTrial: boolean
  trialDaysLeft: number | null   // null when not trialing
  trialExpiresAt: Date | null
  planMonthly: number            // monthly allowance
  bonus: number                  // extra credits purchased this period
  remaining: number              // (planMonthly + bonus) - used
  used: number
  total: number                  // planMonthly + bonus
  cancelAtPeriodEnd: boolean
  periodEnd: Date | null
}

// _uncached owns the actual DB work. resolveEntitlements is called
// ONCE and shared between the breakdown math (which needs it for the
// plan-monthly anchor) and the top-level summary fields — previously
// getCreditBreakdown re-resolved it internally, costing 2 extra
// Subscription + Entitlement round-trips per call. Total Prisma reads
// dropped from 6 → 4 just from this dedupe.
async function _getBillingSummaryUncached(orgId: string): Promise<BillingSummary | null> {
  const [entitlements, subscription] = await Promise.all([
    resolveEntitlements(orgId),
    prisma.subscription.findFirst({
      where: { orgId, status: { in: ["ACTIVE", "TRIALING"] } },
      orderBy: { createdAt: "desc" },
    }),
  ])
  const breakdown = await getCreditBreakdownWithEntitlements(orgId, entitlements)

  const planKey = entitlements.planKey || "free"
  const plan = getPlan(planKey)
  const planName = plan?.name || (planKey === "free" ? "Free" : planKey.charAt(0).toUpperCase() + planKey.slice(1))

  let trialDaysLeft: number | null = null
  if (entitlements.isTrial && entitlements.trialExpiresAt) {
    const ms = entitlements.trialExpiresAt.getTime() - Date.now()
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  }

  return {
    planKey,
    planName,
    isPaid: !!subscription && subscription.status === "ACTIVE",
    isTrial: entitlements.isTrial,
    trialDaysLeft,
    trialExpiresAt: entitlements.trialExpiresAt,
    planMonthly: breakdown.planMonthly,
    bonus: Math.round(breakdown.bonus),
    remaining: Math.max(0, Math.round(breakdown.remaining)),
    used: Math.max(0, Math.round(breakdown.used)),
    total: breakdown.planMonthly + Math.round(breakdown.bonus),
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    periodEnd: subscription?.currentPeriodEnd ?? null,
  }
}

export async function getBillingSummary(orgId: string | null | undefined): Promise<BillingSummary | null> {
  if (!orgId) return null
  // unstable_cache wants a stable function reference per cache key —
  // build a per-org-id cached wrapper, then invoke it. Next.js keys
  // by the spread args + the explicit keyParts, so the orgId is also
  // baked into the keyParts to keep cache slots isolated across
  // tenants. tags: ['billing:${orgId}'] lets us call
  // `revalidateTag` from a Stripe webhook to wipe just THAT org.
  const cached = unstable_cache(
    () => _getBillingSummaryUncached(orgId),
    [`billing-summary:${orgId}`],
    { revalidate: 30, tags: [`billing:${orgId}`] },
  )
  return cached()
}

/**
 * Wipe the cached billing summary for `orgId`. Call from:
 *   - Stripe webhooks (`customer.subscription.updated`, `invoice.paid`,
 *     `checkout.session.completed`)
 *   - Admin entitlement grants (`/admin/users` flip plan / add credits)
 *   - Server-action `createCheckoutSession` completion redirect
 * Cheap — flagging a tag, the next call re-fetches and re-caches.
 */
export function invalidateBillingSummary(orgId: string): void {
  // Next 16's revalidateTag takes an explicit cache profile arg —
  // 'default' is the equivalent of the legacy single-arg behavior.
  revalidateTag(`billing:${orgId}`, "default")
}
