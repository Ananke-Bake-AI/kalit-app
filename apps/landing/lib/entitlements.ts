import { prisma } from "./prisma"
import { FREE_PLAN, getPlan } from "./plans"
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
  const defaults: ResolvedEntitlements = {
    suites: { flow: true, marketing: false, pentest: false, search: false },
    creditsPerMonth: FREE_PLAN.creditsPerMonth,
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
