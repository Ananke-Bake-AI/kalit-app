import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { SignJWT } from "jose"
import { prisma } from "@/lib/prisma"

/**
 * Search suite page — generates SSO token server-side and redirects directly.
 * No client-side launcher to avoid Vercel edge caching issues.
 */
export default async function SearchPage() {
  const session = await auth()
  if (!session?.user?.orgId || !session?.user?.id || !session?.user?.email) {
    redirect(await localeHref("/login"))
  }

  const hasAccess = await checkSuiteAccess(session.user.orgId, "search")
  if (!hasAccess) {
    redirect(await localeHref("/dashboard"))
  }

  // Generate SSO token server-side
  const secret = process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    redirect(await localeHref("/dashboard"))
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: session.user.orgId },
  })

  const encoder = new TextEncoder()
  const token = await new SignJWT({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name || null,
    orgId: session.user.orgId,
    suiteId: "search",
    role: membership?.role || "MEMBER",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setSubject(session.user.id)
    .setIssuer("kalit-main")
    .setAudience("search")
    .sign(encoder.encode(secret))

  const baseUrl = process.env.SUITE_SEARCH_URL || "https://search.kalit.ai"
  const redirectUrl = `${baseUrl}/api/auth/sso/callback?token=${encodeURIComponent(token)}`

  redirect(redirectUrl)
}
