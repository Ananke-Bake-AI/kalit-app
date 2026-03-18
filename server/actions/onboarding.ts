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
