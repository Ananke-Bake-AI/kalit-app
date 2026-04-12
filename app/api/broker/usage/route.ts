import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.user.orgId

  const [entitlements, remaining] = await Promise.all([
    resolveEntitlements(orgId),
    getRemainingCredits(orgId),
  ])

  return NextResponse.json({
    plan: entitlements.planKey || "free",
    creditsPerMonth: entitlements.creditsPerMonth,
    remaining,
    suites: entitlements.suites,
    percentage: entitlements.creditsPerMonth > 0
      ? Math.round((remaining / entitlements.creditsPerMonth) * 100)
      : 0,
  })
}
