import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"
import { checkSuiteAccess, resolveEntitlements } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { getSuiteAppUrl, type SuiteId } from "@/lib/suites"

const VALID_SUITE_IDS: SuiteId[] = ["marketing", "flow", "pentest", "search"]

const SUITE_URLS: Record<string, string> = {
  marketing: process.env.SUITE_MARKETING_URL || "https://marketing.kalit.ai",
  search: process.env.SUITE_SEARCH_URL || "https://search.kalit.ai",
  flow: process.env.SUITE_FLOW_URL || "http://localhost:3004",
  pentest: process.env.SUITE_PENTEST_URL || "http://localhost:3005",
}

/**
 * GET /api/suite/launch?suiteId=search
 *
 * Synchronous, server-side mint-and-redirect into a suite's SSO callback.
 * Used as a plain top-level navigation target (the "Open Search" / launch
 * buttons set window.location to this). The previous approach minted the
 * token via a client `fetch` and THEN set window.location — but mobile Safari
 * blocks navigations performed after an `await`, so logged-in users on mobile
 * saw the button "do nothing". Doing the whole thing in one server GET keeps
 * the navigation synchronous and reliable everywhere.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const suiteId = searchParams.get("suiteId") as SuiteId | null

  if (!suiteId || !VALID_SUITE_IDS.includes(suiteId)) {
    return NextResponse.redirect(new URL("/", origin))
  }

  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(`/api/suite/launch?suiteId=${suiteId}`)}`, origin),
    )
  }

  const orgId = session.user.orgId
  if (!orgId) {
    return NextResponse.redirect(new URL("/onboarding", origin))
  }

  const hasAccess = await checkSuiteAccess(orgId, suiteId)
  if (!hasAccess) {
    return NextResponse.redirect(new URL("/settings/billing", origin))
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  const entitlements = await resolveEntitlements(orgId)

  const secret = process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Server configuration error: missing signing secret" },
      { status: 500 },
    )
  }

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
    .sign(new TextEncoder().encode(secret))

  const baseUrl = SUITE_URLS[suiteId] || getSuiteAppUrl(suiteId)
  if (!baseUrl) {
    return NextResponse.json({ error: "Suite URL not configured" }, { status: 500 })
  }

  return NextResponse.redirect(`${baseUrl}/api/auth/sso/callback?token=${encodeURIComponent(token)}`)
}
