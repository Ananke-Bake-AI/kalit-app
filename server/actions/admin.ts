"use server"

import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import type { MembershipRole, EntitlementSource } from "@prisma/client"

// ─── Metrics ────────────────────────────────────────────

export async function getAdminMetrics() {
  await requireAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    totalUsers, totalOrgs, activeSubscriptions,
    newUsersThisMonth, newUsersLastMonth, newUsersThisWeek, newUsersToday,
    activeJobs, completedJobs, failedJobs,
    creditsUsed, creditsUsedLastMonth,
    totalUsageRecords,
    trialEntitlements
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.job.count({ where: { status: { in: ["RUNNING", "QUEUED"] } } }),
    prisma.job.count({ where: { status: "SUCCEEDED", createdAt: { gte: startOfMonth } } }),
    prisma.job.count({ where: { status: "FAILED", createdAt: { gte: startOfMonth } } }),
    prisma.usageRecord.aggregate({ _sum: { credits: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.usageRecord.aggregate({ _sum: { credits: true }, where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.usageRecord.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.entitlement.count({ where: { source: "TRIAL", expiresAt: { gt: now } } })
  ])

  // Credits usage per suite this month
  const creditsBySuite = await prisma.usageRecord.groupBy({
    by: ["suiteId"],
    _sum: { credits: true },
    where: { createdAt: { gte: startOfMonth } }
  })

  // Signups per day this week
  const dailySignups = await prisma.user.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startOfWeek } },
    _count: true
  })

  // Aggregate daily signups by date
  const signupsByDay: Record<string, number> = {}
  for (let d = 0; d < 7; d++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + d)
    signupsByDay[date.toISOString().slice(0, 10)] = 0
  }
  for (const row of dailySignups) {
    const key = new Date(row.createdAt).toISOString().slice(0, 10)
    signupsByDay[key] = (signupsByDay[key] || 0) + 1
  }

  return {
    totalUsers,
    totalOrgs,
    activeSubscriptions,
    newUsersThisMonth,
    newUsersLastMonth,
    newUsersThisWeek,
    newUsersToday,
    activeJobs,
    completedJobs,
    failedJobs,
    creditsUsedThisMonth: creditsUsed._sum.credits ?? 0,
    creditsUsedLastMonth: creditsUsedLastMonth._sum.credits ?? 0,
    totalUsageRecords,
    activeTrials: trialEntitlements,
    creditsBySuite: creditsBySuite.map((r) => ({ suite: r.suiteId, credits: r._sum.credits ?? 0 })),
    signupsByDay
  }
}

// ─── Quick Assign by Email ──────────────────────────────

export async function assignPlanByEmail(email: string, planKey: string, expiresAt?: string) {
  await requireAdmin()

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { memberships: { where: { isCurrent: true }, include: { org: true }, take: 1 } }
  })

  if (!user) return { error: `No user found with email: ${email}` }
  if (!user.memberships[0]) return { error: `User ${email} has no organization` }

  const orgId = user.memberships[0].orgId
  const result = await assignPlan(orgId, planKey, expiresAt)

  if ("error" in result) return result
  return { success: true, plan: result.plan, orgName: user.memberships[0].org.name }
}

// ─── Users ──────────────────────────────────────────────

export async function getAdminUsers(params: { search?: string; page?: number; limit?: number }) {
  await requireAdmin()

  const { search, page = 1, limit = 20 } = params
  const where = search
    ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { memberships: { include: { org: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function updateUserRole(userId: string, orgId: string, role: MembershipRole) {
  await requireAdmin()

  await prisma.membership.update({
    where: { userId_orgId: { userId, orgId } },
    data: { role }
  })

  return { success: true }
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({ where: { id: userId } })
  return { success: true }
}

// ─── Organizations ──────────────────────────────────────

export async function getAdminOrganizations(params: { search?: string; page?: number; limit?: number }) {
  await requireAdmin()

  const { search, page = 1, limit = 20 } = params
  const where = search
    ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] }
    : {}

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        memberships: { include: { user: true } },
        subscriptions: { where: { status: "ACTIVE" }, take: 1 },
        entitlements: true,
        _count: { select: { memberships: true, jobs: true, usageRecords: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.organization.count({ where })
  ])

  return { orgs, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function grantEntitlement(orgId: string, key: string, value: object, source: EntitlementSource = "MANUAL") {
  await requireAdmin()

  const jsonValue = value as Parameters<typeof prisma.entitlement.create>[0]["data"]["value"]

  await prisma.entitlement.upsert({
    where: { orgId_key: { orgId, key } },
    update: { value: jsonValue, source },
    create: { orgId, key, value: jsonValue, source }
  })

  return { success: true }
}

export async function revokeEntitlement(orgId: string, key: string) {
  await requireAdmin()

  await prisma.entitlement.delete({
    where: { orgId_key: { orgId, key } }
  })

  return { success: true }
}

export async function addCredits(orgId: string, amount: number, reason: string) {
  await requireAdmin()

  await prisma.creditRecord.create({
    data: { orgId, direction: "CREDIT", amount, reason }
  })

  return { success: true }
}

// ─── Plan Assignment ────────────────────────────────────

export async function assignPlan(orgId: string, planKey: string, expiresAt?: string) {
  await requireAdmin()

  const { PLANS } = await import("@/lib/plans")
  const plan = PLANS.find((p) => p.key === planKey)
  if (!plan) return { error: "Unknown plan" }

  const expiry = expiresAt ? new Date(expiresAt) : null

  // Grant all suite entitlements for this plan
  for (const suiteId of plan.suites) {
    await prisma.entitlement.upsert({
      where: { orgId_key: { orgId, key: `suite.${suiteId}.access` } },
      update: { value: { granted: true }, source: "MANUAL", expiresAt: expiry },
      create: { orgId, key: `suite.${suiteId}.access`, value: { granted: true }, source: "MANUAL", expiresAt: expiry }
    })
  }

  // Set monthly credits
  await prisma.entitlement.upsert({
    where: { orgId_key: { orgId, key: "monthly.credits" } },
    update: { value: { amount: plan.creditsPerMonth }, source: "MANUAL", expiresAt: expiry },
    create: { orgId, key: "monthly.credits", value: { amount: plan.creditsPerMonth }, source: "MANUAL", expiresAt: expiry }
  })

  // Set max members
  await prisma.entitlement.upsert({
    where: { orgId_key: { orgId, key: "max.members" } },
    update: { value: { amount: plan.maxMembers }, source: "MANUAL", expiresAt: expiry },
    create: { orgId, key: "max.members", value: { amount: plan.maxMembers }, source: "MANUAL", expiresAt: expiry }
  })

  return { success: true, plan: plan.name }
}

export async function revokePlan(orgId: string) {
  await requireAdmin()

  // Remove all suite entitlements and plan-related entitlements
  await prisma.entitlement.deleteMany({
    where: { orgId, source: "MANUAL" }
  })

  return { success: true }
}

// ─── Monitoring ─────────────────────────────────────────

export async function getAdminJobs(params: { status?: string; page?: number; limit?: number }) {
  await requireAdmin()

  const { status, page = 1, limit = 20 } = params
  const where = status ? { status: status as never } : {}

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { org: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.job.count({ where })
  ])

  return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAdminUsageRecords(params: { page?: number; limit?: number }) {
  await requireAdmin()

  const { page = 1, limit = 30 } = params

  const [records, total] = await Promise.all([
    prisma.usageRecord.findMany({
      include: { org: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.usageRecord.count()
  ])

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getRecentSignups(limit = 10) {
  await requireAdmin()

  return prisma.user.findMany({
    include: { memberships: { include: { org: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: limit
  })
}
