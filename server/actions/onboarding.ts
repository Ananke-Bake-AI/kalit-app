"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/cn"
import type { SuiteId } from "@/lib/app-suites"

interface OnboardingInput {
  orgName: string
  websiteUrl?: string
  primarySuite: SuiteId
}

export async function completeOnboarding(input: OnboardingInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const { orgName, websiteUrl, primarySuite } = input

  if (!orgName || orgName.length < 2) {
    return { error: "Organization name is required" }
  }

  let slug = slugify(orgName)
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Trial: 14 days, all suites, 50 credits
  const trialExpiry = new Date()
  trialExpiry.setDate(trialExpiry.getDate() + 14)

  const trialSuites = ["project", "flow", "marketing", "pentest", "search"]

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        websiteUrl: websiteUrl || null,
        memberships: {
          create: {
            userId: session.user.id,
            role: "OWNER",
            isCurrent: true,
          },
        },
        entitlements: {
          createMany: {
            data: [
              ...trialSuites.map((suiteId) => ({
                key: `suite.${suiteId}.access`,
                value: { granted: true },
                source: "TRIAL" as const,
                expiresAt: trialExpiry,
              })),
              {
                key: "monthly.credits",
                value: { amount: 50 },
                source: "TRIAL" as const,
                expiresAt: trialExpiry,
              },
            ],
          },
        },
      },
    })

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        onboardingDone: true,
        defaultSuite: primarySuite,
      },
    })

    return org
  })

  return { success: true, redirectTo: `/${primarySuite}`, orgId: result.id }
}
