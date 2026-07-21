import { prisma } from "./prisma"
import { getPlan } from "./plans"
import type { SuiteId } from "./suites"

export interface ResolvedEntitlements {
  suites: Record<SuiteId, boolean>
  creditsPerMonth: number
  maxMembers: number
  planKey: string | null
  isTrial: boolean
  trialExpiresAt: Date | null
}

export async function resolveEntitlements(orgId: string): Promise<ResolvedEntitlements> {
  // Free baseline — what an org gets with NO active subscription. This is the
  // perpetual FREE tier: 15 credits/month + Flow (studio) access, no time limit.
  // (The old model granted a 14-day TRIAL on onboarding then dropped to a hard
  // paywall of 0 credits; that trial is gone — free is now ongoing.) Credits are
  // aggregated per calendar month, so this number simply resets each month; paid
  // subscriptions and manual entitlements below raise it for higher tiers.
  const defaults: ResolvedEntitlements = {
    suites: { flow: true, marketing: false, pentest: false, search: false },
    creditsPerMonth: 15,
    maxMembers: 1,
    planKey: "free",
    isTrial: false,
    trialExpiresAt: null,
  }

  // Get active subscription
  const subscription = await prisma.subscription.findFirst({
    where: { orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  })

  if (subscription) {
    const plan = getPlan(subscription.planKey)
    if (plan) {
      defaults.planKey = plan.key
      defaults.creditsPerMonth = plan.creditsPerMonth
      defaults.maxMembers = plan.maxMembers
      for (const suiteId of plan.suites) {
        defaults.suites[suiteId] = true
      }
    }
  }

  // Apply overrides from entitlement table
  const overrides = await prisma.entitlement.findMany({
    where: {
      orgId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  })

  for (const ent of overrides) {
    if (ent.key.startsWith("suite.") && ent.key.endsWith(".access")) {
      const suiteId = ent.key.replace("suite.", "").replace(".access", "") as SuiteId
      if (suiteId in defaults.suites) {
        defaults.suites[suiteId] = true
      }
    }
    if (ent.key === "monthly.credits" && ent.value) {
      const amount = (ent.value as { amount: number }).amount || 0
      defaults.creditsPerMonth = Math.max(defaults.creditsPerMonth, amount)
    }
    if (ent.key === "credits.bonus" && ent.value) {
      defaults.creditsPerMonth += (ent.value as { amount: number }).amount || 0
    }
    if (ent.key === "members.bonus" && ent.value) {
      const bonus = (ent.value as { amount: number }).amount || 0
      if (defaults.maxMembers !== -1) {
        defaults.maxMembers += bonus
      }
    }
    if (ent.source === "TRIAL" && !defaults.isTrial) {
      defaults.isTrial = true
      defaults.trialExpiresAt = ent.expiresAt
    }
  }

  // If no Stripe subscription set planKey, derive it from manual entitlements
  // by matching monthly.credits (each plan has a unique amount: 100/500/2000).
  // Without this, an admin-assigned Enterprise org reports planKey="free"
  // because planKey was only ever written from a Subscription row.
  if (defaults.planKey === "free") {
    if (defaults.creditsPerMonth >= 2000) defaults.planKey = "enterprise"
    else if (defaults.creditsPerMonth >= 500) defaults.planKey = "pro"
    else if (defaults.creditsPerMonth >= 100) defaults.planKey = "starter"
  }

  return defaults
}

export async function checkSuiteAccess(orgId: string, suiteId: SuiteId): Promise<boolean> {
  const entitlements = await resolveEntitlements(orgId)
  return entitlements.suites[suiteId] === true
}

/**
 * Per-period credit breakdown — splits the user's allowance into the
 * monthly plan allocation, any top-up packs purchased, and what's been
 * consumed. Used by the dashboard / billing UI to show "plan usage" and
 * "extra credits" separately so a paid top-up doesn't get hidden behind
 * a never-incrementing "0 / 75" bar.
 */
export interface CreditBreakdown {
  planMonthly: number   // plan allowance for the month (e.g. 75 for Starter)
  bonus: number          // sum of CreditRecord CREDIT this period (top-up packs + admin grants)
  used: number           // usageRecord.credits + creditRecord DEBIT this period
  remaining: number      // (planMonthly + bonus) - used, never < 0
}

export async function getCreditBreakdown(orgId: string): Promise<CreditBreakdown> {
  // Backward-compatible wrapper — most callers don't pre-resolve
  // entitlements, so we keep the original signature. Hot paths that
  // ALREADY have entitlements in scope (the studio layout's
  // getBillingSummary) should call getCreditBreakdownWithEntitlements
  // directly to skip the second resolve round-trip.
  const entitlements = await resolveEntitlements(orgId)
  return getCreditBreakdownWithEntitlements(orgId, entitlements)
}

/**
 * Same math as `getCreditBreakdown` but accepts a pre-resolved
 * `entitlements` object. Used by `getBillingSummary` so we don't fan
 * out a duplicate Subscription + Entitlement read on every /studio
 * navigation. With the prior code path the studio layout was issuing
 * ~6 Prisma reads against a transatlantic Neon (Vercel iad1 → Neon
 * eu-central-1 ≈ 120 ms each) on every request; this drops it to 4.
 */
export async function getCreditBreakdownWithEntitlements(
  orgId: string,
  entitlements: ResolvedEntitlements,
): Promise<CreditBreakdown> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [usage, bonusAgg, debitsAgg] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: { orgId, createdAt: { gte: startOfMonth } },
      _sum: { credits: true },
    }),
    prisma.creditRecord.aggregate({
      where: { orgId, direction: "CREDIT", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.creditRecord.aggregate({
      where: { orgId, direction: "DEBIT", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ])

  const usedCredits = usage._sum.credits ? Number(usage._sum.credits) : 0
  const debits = debitsAgg._sum.amount || 0
  const bonus = bonusAgg._sum.amount || 0
  const used = usedCredits + debits

  return {
    planMonthly: entitlements.creditsPerMonth,
    bonus,
    used,
    remaining: Math.max(0, entitlements.creditsPerMonth + bonus - used),
  }
}

export async function getRemainingCredits(orgId: string): Promise<number> {
  const entitlements = await resolveEntitlements(orgId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const used = await prisma.usageRecord.aggregate({
    where: { orgId, createdAt: { gte: startOfMonth } },
    _sum: { credits: true },
  })

  const bonus = await prisma.creditRecord.aggregate({
    where: { orgId, direction: "CREDIT", createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
  })

  const debits = await prisma.creditRecord.aggregate({
    where: { orgId, direction: "DEBIT", createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
  })

  // UsageRecord.credits is now a Decimal column (Prisma returns Prisma.Decimal
  // instances for sums). Coerce via Number() so the subtraction below stays
  // numeric — without this the math silently produces NaN. CreditRecord.amount
  // is still Int (whole-credit purchases), so its sums are plain numbers.
  const usedCredits = used._sum.credits ? Number(used._sum.credits) : 0
  const totalAvailable = entitlements.creditsPerMonth + (bonus._sum.amount || 0)
  const totalUsed = usedCredits + (debits._sum.amount || 0)

  return Math.max(0, totalAvailable - totalUsed)
}
