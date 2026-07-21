/**
 * Lazy org provisioning for magnet claims.
 *
 * A magnet visitor signs up and goes straight to the studio to watch their
 * rebuild — they skip the normal /setup onboarding (friction before the wow
 * kills conversion). The broker needs an org for the build to run. This mirrors
 * completeOnboarding() minimally and idempotently: if the user already has a
 * current membership, it's a no-op.
 *
 * The org inherits the perpetual FREE tier (15 credits/month + Flow) from
 * resolveEntitlements' baseline — NO trial entitlements are written (Kalit no
 * longer has a 14-day trial). The name is kept for its callers; it provisions a
 * plain free org.
 *
 * Returns the orgId the user should build under.
 */
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/cn"

export async function ensureOrgWithTrial(
  userId: string,
  displayName: string | null,
): Promise<{ orgId: string; provisioned: boolean }> {
  const current = await prisma.membership.findFirst({
    where: { userId, isCurrent: true },
    select: { orgId: true },
  })
  if (current) return { orgId: current.orgId, provisioned: false }

  const orgName = (displayName?.trim() || "My") + " Workspace"
  let slug = slugify(orgName)
  if (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        memberships: {
          create: { userId, role: "OWNER", isCurrent: true },
        },
        // No trial entitlements — the org gets the perpetual FREE tier
        // (15 credits/month + Flow) from resolveEntitlements' baseline.
      },
    })
    await tx.user.update({
      where: { id: userId },
      data: { onboardingDone: true, defaultSuite: "flow" },
    })
    return created
  })

  return { orgId: org.id, provisioned: true }
}
