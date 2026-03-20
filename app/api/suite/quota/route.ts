import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"

/**
 * GET /api/suite/quota?orgId=...&suiteId=...&action=hotfix,download
 *
 * Returns per-action usage counts and remaining credits for the current month.
 * Called by suites (e.g. Flow) to display quota info in modals.
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "")

  if (!apiKey || apiKey !== process.env.SUITE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get("orgId")
  const suiteId = req.nextUrl.searchParams.get("suiteId") || "flow"
  const actions = req.nextUrl.searchParams.get("actions")?.split(",").filter(Boolean) || []

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const entitlements = await resolveEntitlements(orgId)
  const remainingCredits = await getRemainingCredits(orgId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Count usage per requested action this month
  const actionCounts: Record<string, number> = {}
  if (actions.length > 0) {
    const usageRows = await prisma.usageRecord.groupBy({
      by: ["action"],
      where: {
        orgId,
        suiteId,
        action: { in: actions },
        createdAt: { gte: startOfMonth },
      },
      _count: { action: true },
    })
    for (const row of usageRows) {
      actionCounts[row.action] = row._count.action
    }
    // Fill missing actions with 0
    for (const a of actions) {
      if (!(a in actionCounts)) actionCounts[a] = 0
    }
  }

  return NextResponse.json({
    plan: entitlements.planKey || "free",
    creditsPerMonth: entitlements.creditsPerMonth,
    remainingCredits,
    actionUsage: actionCounts,
  })
}
