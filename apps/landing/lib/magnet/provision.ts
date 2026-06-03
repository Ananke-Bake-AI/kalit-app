/**
 * Lazy org + trial provisioning for magnet claims.
 *
 * A magnet visitor signs up and goes straight to the studio to watch their
 * rebuild — they skip the normal /setup onboarding (friction before the wow
 * kills conversion). But the broker needs an org + trial credits for the
 * build to run. This mirrors completeOnboarding() minimally and idempotently:
 * if the user already has a current membership, it's a no-op.
 *
 * Returns the orgId the user should build under.
 */
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/cn"

const TRIAL_SUITES = ["flow", "marketing", "pentest", "search"]
// Magnet builds are multi-agent (import → rebuild → deploy) and we want the
// wow to *complete* on the house — so grant more than the 5-credit guided
// trial. Tunable; abuse is bounded by 1 magnet build per account + the gate
// on shipping/owning the result.
const MAGNET_TRIAL_CREDITS = Number(process.env.MAGNET_TRIAL_CREDITS || 25)

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

  const trialExpiry = new Date()
  trialExpiry.setDate(trialExpiry.getDate() + 14)

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        memberships: {
          create: { userId, role: "OWNER", isCurrent: true },
        },
        entitlements: {
          createMany: {
            data: [
              ...TRIAL_SUITES.map((suiteId) => ({
                key: `suite.${suiteId}.access`,
                value: { granted: true },
                source: "TRIAL" as const,
                expiresAt: trialExpiry,
              })),
              {
                key: "monthly.credits",
                value: { amount: MAGNET_TRIAL_CREDITS },
                source: "TRIAL" as const,
                expiresAt: trialExpiry,
              },
            ],
          },
        },
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
