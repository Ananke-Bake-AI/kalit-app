"use server"

import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import type { MembershipRole, EntitlementSource } from "@prisma/client"

// ─── Admin Role ────────────────────────────────────────

export async function toggleAdmin(userId: string, value: boolean) {
  const session = await requireAdmin()

  // Prevent removing your own admin
  if (session.user.id === userId && !value) {
    return { error: "You cannot remove your own admin access" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: value },
  })

  return { success: true }
}

// ─── Campaigns ─────────────────────────────────────────

export async function getAllVerifiedUsers() {
  await requireAdmin()

  return prisma.user.findMany({
    where: { emailVerified: { not: null }, emailUnsubscribed: false },
    select: { email: true, name: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCampaignStats() {
  await requireAdmin()

  const [totalUsers, verifiedUsers, unsubscribedUsers, languageBreakdown] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null }, emailUnsubscribed: false } }),
    prisma.user.count({ where: { emailUnsubscribed: true } }),
    prisma.user.groupBy({
      by: ["preferredLanguage"],
      where: { emailVerified: { not: null }, emailUnsubscribed: false },
      _count: true,
      orderBy: { _count: { preferredLanguage: "desc" } },
    }),
  ])

  return {
    totalUsers,
    verifiedUsers,
    unsubscribedUsers,
    languages: languageBreakdown.map((r) => ({
      code: r.preferredLanguage || "en",
      count: r._count,
    })),
  }
}

export async function sendCampaign(
  subject: string,
  body: string,
  translations?: Record<string, { subject: string; body: string }>
) {
  await requireAdmin()

  if (!subject.trim() || !body.trim()) {
    return { error: "Subject and body are required" }
  }

  const { buildCampaignEmailHtml, sendBulkEmails } = await import("@/lib/email")
  const { getUnsubscribeUrl } = await import("@/lib/unsubscribe")

  // Fetch users with their preferred language
  const users = await prisma.user.findMany({
    where: { emailVerified: { not: null }, emailUnsubscribed: false },
    select: { email: true, name: true, preferredLanguage: true },
    orderBy: { createdAt: "desc" },
  })

  if (users.length === 0) {
    return { error: "No verified users to send to" }
  }

  const batch = users.map((user) => {
    const lang = user.preferredLanguage || "en"
    const t = translations?.[lang]
    const userSubject = t?.subject || subject
    const userBody = t?.body || body

    const name = user.name || "there"
    const personalizedBody = userBody
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{email\}\}/g, user.email)
    const unsubscribeUrl = getUnsubscribeUrl(user.email)
    const html = buildCampaignEmailHtml(userSubject, personalizedBody, unsubscribeUrl)
    return { to: user.email, subject: userSubject, html, unsubscribeUrl }
  })

  const result = await sendBulkEmails(batch)

  return {
    success: true,
    sent: result.sent,
    total: users.length,
    errors: result.errors,
  }
}

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
    // UsageRecord.credits is now Decimal — Prisma returns Prisma.Decimal
    // for sums on this column. Coerce to plain numbers at the boundary so
    // the dashboard widgets that consume these fields can keep doing
    // arithmetic and render directly.
    creditsUsedThisMonth: creditsUsed._sum.credits ? Number(creditsUsed._sum.credits) : 0,
    creditsUsedLastMonth: creditsUsedLastMonth._sum.credits ? Number(creditsUsedLastMonth._sum.credits) : 0,
    totalUsageRecords,
    activeTrials: trialEntitlements,
    creditsBySuite: creditsBySuite.map((r) => ({ suite: r.suiteId, credits: r._sum.credits ? Number(r._sum.credits) : 0 })),
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

// ─── Deployments ────────────────────────────────────────

interface DeploymentRow {
  id: string
  title: string | null
  status: string
  vercel_project_name: string | null
  vercel_url: string | null
  vercel_deployed_at: Date | null
  subdomain: string | null
  subdomain_deployed_at: Date | null
  broker_session_id: string | null
  session_exists: boolean
  user_email: string | null
  created_at: Date
}

export async function getDeployments() {
  await requireAdmin()

  // Raw query — flow_projects is broker-managed and not modeled in Prisma.
  // LEFT JOIN flow_chat_sessions to figure out whether each deployment is
  // still "linked" to an existing session. Orphan = broker_session_id is
  // NULL OR the referenced session row no longer exists.
  //
  // We COALESCE vercel_project_name with `'flow-' || subdomain` because the
  // older deploySubdomain path historically deployed to Vercel under that
  // exact name pattern (see broker deploy_service.go: vercelProjectName =
  // "flow-" + slug) but never persisted the field. So every row with a
  // subdomain IS effectively a Vercel project — derive the name so the
  // admin can hit Vercel's DELETE endpoint for it.
  const rows = await prisma.$queryRaw<DeploymentRow[]>`
    SELECT
      p.id,
      p.title,
      p.status,
      COALESCE(p.vercel_project_name, 'flow-' || p.subdomain) AS vercel_project_name,
      p.vercel_url,
      p.vercel_deployed_at,
      p.subdomain,
      p.subdomain_deployed_at,
      p.broker_session_id,
      (s.id IS NOT NULL) AS session_exists,
      u.email AS user_email,
      p.created_at
    FROM flow_projects p
    LEFT JOIN flow_chat_sessions s ON s.id::text = p.broker_session_id
    LEFT JOIN "User" u ON u.id = p.user_id
    WHERE p.vercel_project_name IS NOT NULL
       OR p.subdomain IS NOT NULL
    ORDER BY COALESCE(p.vercel_deployed_at, p.subdomain_deployed_at, p.created_at) DESC
    LIMIT 500
  `

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    vercelProjectName: r.vercel_project_name,
    vercelUrl: r.vercel_url,
    vercelDeployedAt: r.vercel_deployed_at?.toISOString() ?? null,
    subdomain: r.subdomain,
    subdomainDeployedAt: r.subdomain_deployed_at?.toISOString() ?? null,
    brokerSessionId: r.broker_session_id,
    sessionExists: r.session_exists,
    userEmail: r.user_email,
    createdAt: r.created_at.toISOString(),
    isOrphaned: !r.broker_session_id || !r.session_exists,
  }))
}

export async function teardownDeployment(flowProjectId: string, opts?: { dropRow?: boolean }) {
  await requireAdmin()

  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const internalToken = process.env.BROKER_INTERNAL_TOKEN
  if (!internalToken) {
    return { error: "BROKER_INTERNAL_TOKEN not configured on landing — cannot reach broker admin endpoint" }
  }

  try {
    const res = await fetch(`${brokerUrl}/internal/admin/project/teardown`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({ flowProjectId, dropRow: opts?.dropRow ?? false }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: (data as { error?: string }).error || `Broker returned ${res.status}` }
    }
    return (await res.json()) as {
      success: boolean
      vercelDeleted?: boolean
      subdomainCleared?: boolean
      rowDropped?: boolean
      vercelError?: string
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function teardownAllOrphans() {
  await requireAdmin()

  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const internalToken = process.env.BROKER_INTERNAL_TOKEN
  if (!internalToken) {
    return { error: "BROKER_INTERNAL_TOKEN not configured on landing — cannot reach broker admin endpoint" }
  }

  try {
    const res = await fetch(`${brokerUrl}/internal/admin/project/teardown-orphans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalToken}`,
      },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: (data as { error?: string }).error || `Broker returned ${res.status}` }
    }
    return (await res.json()) as {
      success: boolean
      orphans: number
      vercelOK: number
      vercelFail: number
      rowsDropped: number
      lastError?: string
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// ─── Featured projects (landing curation) ──────────────

interface AdminFeaturedRow {
  id: string
  title: string
  displayName: string
  featuredTitle: string
  featuredSubtitle: string
  url: string
  hasThumbnail: boolean
  featuredAt: string | null
}

export async function getAdminFeaturedProjects() {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const internalToken = process.env.BROKER_INTERNAL_TOKEN
  if (!internalToken) {
    return { error: "BROKER_INTERNAL_TOKEN not configured" }
  }
  try {
    const res = await fetch(`${brokerUrl}/internal/admin/featured-projects`, {
      headers: { Authorization: `Bearer ${internalToken}` },
      cache: "no-store",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: (data as { error?: string }).error || `Broker ${res.status}` }
    }
    return (await res.json()) as { projects: AdminFeaturedRow[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function setProjectFeatured(
  id: string,
  patch: { featured?: boolean; featuredTitle?: string; featuredSubtitle?: string },
) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const internalToken = process.env.BROKER_INTERNAL_TOKEN
  if (!internalToken) {
    return { error: "BROKER_INTERNAL_TOKEN not configured" }
  }
  try {
    const res = await fetch(`${brokerUrl}/internal/admin/featured-projects/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${internalToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: (data as { error?: string }).error || `Broker ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Re-capture the thumbnail for one project. Used by the admin
// featured-projects page to fix screenshots that landed mid-build
// or before Vercel propagation. Broker queues the capture
// asynchronously (~5-10s end-to-end) and we return immediately.
export async function refreshProjectThumbnail(id: string) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const internalToken = process.env.BROKER_INTERNAL_TOKEN
  if (!internalToken) {
    return { error: "BROKER_INTERNAL_TOKEN not configured" }
  }
  try {
    const res = await fetch(
      `${brokerUrl}/internal/admin/projects/${id}/refresh-thumbnail`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${internalToken}` },
      },
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: (data as { error?: string }).error || `Broker ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
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

// ─── Bug Reports (admin CRUD) ───────────────────────────

export interface BugReportRow {
  id: string
  userId: string
  userEmail: string
  userUsername: string
  externalOrgId: string
  sessionId: string | null
  projectId: string | null
  description: string
  status: "open" | "investigating" | "resolved" | "invalid" | "duplicate"
  adminNote: string | null
  creditsAwarded: number
  creditAwardedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BugReportDetail extends BugReportRow {
  context: Record<string, unknown>
}

export async function listBugReports(statusFilter?: string) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const token = process.env.BROKER_INTERNAL_TOKEN
  if (!token) return { error: "BROKER_INTERNAL_TOKEN not configured" }
  const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""
  try {
    const res = await fetch(`${brokerUrl}/internal/admin/bug-reports${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) {
      return { error: `Broker ${res.status}` }
    }
    return (await res.json()) as { reports: BugReportRow[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function getBugReport(id: string) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const token = process.env.BROKER_INTERNAL_TOKEN
  if (!token) return { error: "BROKER_INTERNAL_TOKEN not configured" }
  try {
    const res = await fetch(`${brokerUrl}/internal/admin/bug-reports/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return { error: `Broker ${res.status}` }
    return (await res.json()) as BugReportDetail
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// updateBugReport patches status/note/credits. When creditsAwarded is
// passed and non-zero AND the report wasn't already awarded, ALSO
// insert a CreditRecord on the reporter's org so the bonus credits
// show up in their balance immediately. This is the "incentive"
// half of the feature — admin clicks "Award 100 credits" and the
// reporter sees +100 in their monthly quota.
export async function updateBugReport(
  id: string,
  patch: {
    status?: BugReportRow["status"]
    adminNote?: string
    creditsAwarded?: number
  },
) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const token = process.env.BROKER_INTERNAL_TOKEN
  if (!token) return { error: "BROKER_INTERNAL_TOKEN not configured" }

  // Read the current row first so we can detect "first-time award" and
  // capture orgId for the CreditRecord insert.
  const current = await getBugReport(id)
  if ("error" in current) return current

  try {
    const res = await fetch(`${brokerUrl}/internal/admin/bug-reports/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error || `Broker ${res.status}` }
    }
    const updated = (await res.json()) as BugReportDetail

    // Credit award side-effect — only fires on a *new* positive amount.
    // Patching status alone (without creditsAwarded) skips this branch.
    const shouldAward =
      patch.creditsAwarded != null &&
      patch.creditsAwarded > 0 &&
      current.creditsAwarded === 0 &&
      current.externalOrgId
    if (shouldAward) {
      try {
        await prisma.creditRecord.create({
          data: {
            orgId: current.externalOrgId,
            direction: "CREDIT",
            amount: patch.creditsAwarded!,
            reason: `bug-report-reward:${id}`,
          },
        })
      } catch (err) {
        // Log but don't fail the patch — the bug_report row is the
        // source of truth that the admin acted; the credit can be
        // retried manually if the insert blew up (rare).
        console.error("[updateBugReport] CreditRecord insert failed:", err)
      }
    }

    return { success: true, report: updated }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteBugReport(id: string) {
  await requireAdmin()
  const brokerUrl = process.env.BROKER_URL?.replace(/\/+$/, "") || "http://localhost:9000"
  const token = process.env.BROKER_INTERNAL_TOKEN
  if (!token) return { error: "BROKER_INTERNAL_TOKEN not configured" }
  try {
    const res = await fetch(`${brokerUrl}/internal/admin/bug-reports/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { error: `Broker ${res.status}` }
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// ─── App Settings (Stripe keys + future runtime secrets) ───

export async function getAppSettings() {
  await requireAdmin()
  const { ALL_STRIPE_KEYS, listSettingsMeta } = await import("@/lib/settings")
  const stripeKeys = await listSettingsMeta(ALL_STRIPE_KEYS as unknown as string[])
  return { stripeKeys }
}

export async function setAppSetting(key: string, value: string) {
  const session = await requireAdmin()
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: "Value cannot be empty — use Clear to remove a setting" }
  }
  // Allowlist guard: only let the admin write keys we explicitly expose
  // here. Without this, a typo on the client would silently create a
  // dead AppSetting row that no one reads.
  const { ALL_STRIPE_KEYS, setSetting } = await import("@/lib/settings")
  if (!(ALL_STRIPE_KEYS as readonly string[]).includes(key)) {
    return { error: `Unknown setting key: ${key}` }
  }
  try {
    await setSetting(key, trimmed, session.user.id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed" }
  }
}

export async function clearAppSetting(key: string) {
  await requireAdmin()
  const { ALL_STRIPE_KEYS, clearSetting } = await import("@/lib/settings")
  if (!(ALL_STRIPE_KEYS as readonly string[]).includes(key)) {
    return { error: `Unknown setting key: ${key}` }
  }
  try {
    await clearSetting(key)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Clear failed" }
  }
}

// ─── Revenue ────────────────────────────────────────────

export async function getAdminRevenue() {
  await requireAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { PLANS } = await import("@/lib/plans")

  // All subscriptions with org + members
  const subscriptions = await prisma.subscription.findMany({
    include: {
      org: {
        include: {
          memberships: { include: { user: true } },
          entitlements: true,
          _count: { select: { jobs: true, usageRecords: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  // Real Stripe subscriptions get an opaque `sub_<base62>` id (live ones are
  // `sub_1…`). Internal/comp accounts are seeded with readable ids
  // (`sub_manual_…`, `sub_internal_…`, `sub_test_…`) — they must NOT count
  // toward revenue or they inflate MRR/ARR with money no one is paying.
  const isTestSub = (stripeSubscriptionId: string | null | undefined) =>
    /^sub_(manual|internal|test)_/i.test(stripeSubscriptionId ?? "")

  // Compute MRR — paying (non-test) active/trialing subs only.
  const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIALING")
  const realActiveSubscriptions = activeSubscriptions.filter((s) => !isTestSub(s.stripeSubscriptionId))
  let mrr = 0
  const planBreakdown: Record<string, { count: number; revenue: number }> = {}

  for (const sub of realActiveSubscriptions) {
    const plan = PLANS.find((p) => p.key === sub.planKey)
    if (plan) {
      mrr += plan.monthlyPrice
      if (!planBreakdown[plan.key]) planBreakdown[plan.key] = { count: 0, revenue: 0 }
      planBreakdown[plan.key].count++
      planBreakdown[plan.key].revenue += plan.monthlyPrice
    }
  }

  // "Real" totals exclude test/internal subs so the headline stats are honest.
  const realSubscriptions = subscriptions.filter((s) => !isTestSub(s.stripeSubscriptionId))
  const testCount = subscriptions.length - realSubscriptions.length

  // Churned this month (real subs only)
  const churned = realSubscriptions.filter(
    (s) => s.status === "CANCELED" && s.updatedAt >= startOfMonth
  ).length

  // Manual/trial entitlements (non-paying users with access)
  const manualOrgs = await prisma.entitlement.groupBy({
    by: ["orgId"],
    where: { source: { in: ["MANUAL", "TRIAL"] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
  })

  return {
    mrr,
    arr: mrr * 12,
    totalSubscriptions: realSubscriptions.length,
    activeCount: realActiveSubscriptions.length,
    testCount,
    churnedThisMonth: churned,
    manualAccessOrgs: manualOrgs.length,
    planBreakdown: Object.entries(planBreakdown).map(([key, val]) => ({
      plan: key,
      name: PLANS.find((p) => p.key === key)?.name || key,
      ...val
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      orgName: s.org.name,
      orgSlug: s.org.slug,
      stripeSubscriptionId: s.stripeSubscriptionId,
      stripePriceId: s.stripePriceId,
      planKey: s.planKey,
      status: s.status,
      isTest: isTestSub(s.stripeSubscriptionId),
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      createdAt: s.createdAt,
      ownerEmail: s.org.memberships.find((m) => m.role === "OWNER")?.user.email || "—",
      ownerName: s.org.memberships.find((m) => m.role === "OWNER")?.user.name || "—",
      memberCount: s.org.memberships.length,
      jobCount: s.org._count.jobs,
      usageCount: s.org._count.usageRecords,
      entitlements: s.org.entitlements.map((e) => e.key),
      stripeCustomerId: s.org.stripeCustomerId
    }))
  }
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

  // credits is Decimal — coerce to number at the boundary so the admin
  // monitoring table can render it directly and the parent component
  // doesn't need to know about the Prisma.Decimal type.
  const normalized = records.map((r) => ({ ...r, credits: Number(r.credits) }))
  return { records: normalized, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getRecentSignups(limit = 10) {
  await requireAdmin()

  return prisma.user.findMany({
    include: { memberships: { include: { org: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: limit
  })
}

// ─── Blog ─────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  )
}

export async function listBlogPosts() {
  await requireAdmin()
  return prisma.blogPost.findMany({
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }, { updatedAt: "desc" }]
  })
}

export async function getBlogPost(id: string) {
  await requireAdmin()
  return prisma.blogPost.findUnique({ where: { id } })
}

interface BlogPostInput {
  slug?: string
  title: string
  description: string
  body: string
  authorName: string
  authorAvatarUrl?: string | null
  coverImageUrl?: string | null
  ogImageUrl?: string | null
  tags?: string[]
  seoTitle?: string | null
  seoDescription?: string | null
  translations?: Record<string, unknown> | null
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  publishedAt?: Date | string | null
}

function normalizeStatus(s?: string): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  if (s === "PUBLISHED" || s === "ARCHIVED") return s
  return "DRAFT"
}

export async function createBlogPost(input: BlogPostInput) {
  await requireAdmin()
  if (!input.title?.trim()) return { error: "Title is required" }
  if (!input.body?.trim()) return { error: "Body is required" }
  if (!input.authorName?.trim()) return { error: "Author is required" }

  const desiredSlug = input.slug?.trim() || slugify(input.title)
  if (!SLUG_RE.test(desiredSlug)) return { error: "Invalid slug format" }

  const exists = await prisma.blogPost.findUnique({ where: { slug: desiredSlug } })
  if (exists) return { error: `Slug "${desiredSlug}" is already taken` }

  const status = normalizeStatus(input.status)
  const publishedAt = input.publishedAt
    ? new Date(input.publishedAt)
    : status === "PUBLISHED"
      ? new Date()
      : null

  const post = await prisma.blogPost.create({
    data: {
      slug: desiredSlug,
      status,
      title: input.title.trim(),
      description: input.description.trim(),
      body: input.body,
      authorName: input.authorName.trim(),
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      tags: input.tags ?? [],
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      translations: (input.translations as object | undefined) ?? undefined,
      publishedAt
    }
  })

  return { post }
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  await requireAdmin()
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return { error: "Post not found" }

  if (!input.title?.trim()) return { error: "Title is required" }
  if (!input.body?.trim()) return { error: "Body is required" }
  if (!input.authorName?.trim()) return { error: "Author is required" }

  const desiredSlug = input.slug?.trim() || existing.slug
  if (!SLUG_RE.test(desiredSlug)) return { error: "Invalid slug format" }
  if (desiredSlug !== existing.slug) {
    const clash = await prisma.blogPost.findUnique({ where: { slug: desiredSlug } })
    if (clash) return { error: `Slug "${desiredSlug}" is already taken` }
  }

  const status = normalizeStatus(input.status)
  // Set publishedAt the first time a post transitions to PUBLISHED; preserve
  // the original date on subsequent edits so the public sort order doesn't
  // jump every time someone tweaks a typo.
  let publishedAt = existing.publishedAt
  if (status === "PUBLISHED" && !publishedAt) publishedAt = new Date()
  if (status !== "PUBLISHED" && input.status === "DRAFT") publishedAt = null
  if (input.publishedAt) publishedAt = new Date(input.publishedAt)

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      slug: desiredSlug,
      status,
      title: input.title.trim(),
      description: input.description.trim(),
      body: input.body,
      authorName: input.authorName.trim(),
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      tags: input.tags ?? [],
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      translations: (input.translations as object | undefined) ?? undefined,
      publishedAt
    }
  })

  return { post }
}

export async function deleteBlogPost(id: string) {
  await requireAdmin()
  await prisma.blogPost.delete({ where: { id } })
  return { success: true }
}

