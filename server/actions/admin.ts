"use server"

import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import type { MembershipRole, EntitlementSource } from "@prisma/client"

// ─── Metrics ────────────────────────────────────────────

export async function getAdminMetrics() {
  await requireAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalUsers, totalOrgs, activeSubscriptions, newUsersThisMonth, activeJobs, creditsUsed] =
    await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { status: { in: ["RUNNING", "QUEUED"] } } }),
      prisma.usageRecord.aggregate({ _sum: { credits: true }, where: { createdAt: { gte: startOfMonth } } })
    ])

  return {
    totalUsers,
    totalOrgs,
    activeSubscriptions,
    newUsersThisMonth,
    activeJobs,
    creditsUsedThisMonth: creditsUsed._sum.credits ?? 0
  }
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
