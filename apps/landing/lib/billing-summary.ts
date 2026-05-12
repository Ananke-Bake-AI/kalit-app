import { prisma } from "./prisma"
import { getCreditBreakdown, resolveEntitlements } from "./entitlements"
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

export async function getBillingSummary(orgId: string | null | undefined): Promise<BillingSummary | null> {
  if (!orgId) return null

  const [entitlements, breakdown, subscription] = await Promise.all([
    resolveEntitlements(orgId),
    getCreditBreakdown(orgId),
    prisma.subscription.findFirst({
      where: { orgId, status: { in: ["ACTIVE", "TRIALING"] } },
      orderBy: { createdAt: "desc" },
    }),
  ])

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
