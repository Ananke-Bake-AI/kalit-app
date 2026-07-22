import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/cn"

/**
 * The Kimi-style studio funnel drops signed-in users straight into /studio
 * with no /setup step, so a user can reach here with no org yet. Provision
 * one on demand with a default name (renameable later in settings) and mark
 * onboarding done — the free tier is the entitlements baseline, no rows
 * needed.
 */
async function resolveOrgId(userId: string, sessionOrgId: string | null | undefined, fallbackName: string): Promise<string | null> {
  if (sessionOrgId) return sessionOrgId

  // The JWT can lag behind the DB (org created after sign-in) — check first.
  const membership = await prisma.membership.findFirst({
    where: { userId, isCurrent: true },
    select: { orgId: true },
  })
  if (membership) return membership.orgId

  const orgName = fallbackName || "My workspace"
  let slug = slugify(orgName)
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  try {
    const org = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: two parallel token fetches from the
      // same fresh user must not create two orgs.
      const race = await tx.membership.findFirst({
        where: { userId, isCurrent: true },
        select: { orgId: true },
      })
      if (race) return { id: race.orgId }

      const created = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          memberships: {
            create: { userId, role: "OWNER", isCurrent: true },
          },
        },
      })
      await tx.user.update({
        where: { id: userId },
        data: { onboardingDone: true },
      })
      return created
    })
    return org.id
  } catch (error) {
    console.error("[broker/token] Org auto-provision failed:", error)
    return null
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secret = process.env.BROKER_JWT_SECRET || process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error: missing signing secret" },
        { status: 500 }
      )
    }

    const orgId = await resolveOrgId(
      session.user.id,
      session.user.orgId,
      session.user.name || session.user.email.split("@")[0]
    )

    const encoder = new TextEncoder()
    const token = await new SignJWT({
      email: session.user.email,
      name: session.user.name || null,
      orgId: orgId || null,
      isAdmin: session.user.isAdmin === true,
      externalUserId: session.user.id,
      externalOrgId: orgId || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setSubject(session.user.id)
      .setIssuer("kalit-main")
      .sign(encoder.encode(secret))

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[broker/token] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
