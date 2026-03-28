import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"
import { checkSuiteAccess, resolveEntitlements } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { getSuiteAppUrl, type SuiteId } from "@/lib/suites"

const VALID_SUITE_IDS: SuiteId[] = ["marketing", "project", "flow", "pentest", "search"]

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = session.user.orgId
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const suiteId = body.suiteId as SuiteId

    if (!suiteId || !VALID_SUITE_IDS.includes(suiteId)) {
      return NextResponse.json(
        { error: "Invalid suiteId. Must be one of: marketing, project, flow, pentest" },
        { status: 400 }
      )
    }

    // Check the user has access to the requested suite
    const hasAccess = await checkSuiteAccess(orgId, suiteId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this suite. Please upgrade your plan." },
        { status: 403 }
      )
    }

    // Get org membership for the user
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, orgId },
    })

    // Resolve entitlements for the JWT payload
    const entitlements = await resolveEntitlements(orgId)

    // Sign the JWT
    const secret = process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error: missing signing secret" },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    const token = await new SignJWT({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name || null,
      orgId,
      suiteId,
      role: membership?.role || "MEMBER",
      entitlements: {
        suites: entitlements.suites,
        creditsPerMonth: entitlements.creditsPerMonth,
        maxMembers: entitlements.maxMembers,
        planKey: entitlements.planKey,
      },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setSubject(session.user.id)
      .setIssuer("kalit-main")
      .setAudience(suiteId)
      .sign(encoder.encode(secret))

    // Resolve suite URL — use env var with hardcoded fallbacks for reliability
    const SUITE_URLS: Record<string, string> = {
      marketing: process.env.SUITE_MARKETING_URL || "https://marketing.kalit.ai",
      search: process.env.SUITE_SEARCH_URL || "https://research.kalit.ai",
      flow: process.env.SUITE_FLOW_URL || "http://localhost:3004",
      project: process.env.SUITE_PROJECT_URL || "http://localhost:3003",
      pentest: process.env.SUITE_PENTEST_URL || "http://localhost:3005",
    }
    const baseUrl = SUITE_URLS[suiteId] || getSuiteAppUrl(suiteId)
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Suite URL not configured" },
        { status: 500 }
      )
    }

    const redirectUrl = `${baseUrl}/api/auth/sso/callback?token=${encodeURIComponent(token)}`

    return NextResponse.json({ token, redirectUrl, _debug: { baseUrl, suiteId, v: 2 } })
  } catch (error) {
    console.error("[suite/token] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
