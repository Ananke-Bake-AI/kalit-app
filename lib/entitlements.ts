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
    suites: { project: false, flow: true, marketing: false, pentest: false, search: false },
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

  const totalAvailable = entitlements.creditsPerMonth + (bonus._sum.amount || 0)
  const totalUsed = (used._sum.credits || 0) + (debits._sum.amount || 0)

  return Math.max(0, totalAvailable - totalUsed)
}
