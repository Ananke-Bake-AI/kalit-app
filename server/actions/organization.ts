"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/cn"
import { createOrgSchema, type CreateOrgInput } from "@/schemas/organization"

export async function createOrganization(input: CreateOrgInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const parsed = createOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, websiteUrl } = parsed.data
  let slug = slugify(name)

  // Ensure unique slug
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const org = await prisma.organization.create({
    data: {
      name,
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

  return { success: true, orgId: org.id }
}

export async function getCurrentOrg() {
  const session = await auth()
  if (!session?.user?.id) return null

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { org: true },
  })

  return membership?.org || null
}

export async function switchOrg(orgId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })

  if (!membership) {
    return { error: "Not a member of this organization" }
  }

  // Unset all current, set this one
  await prisma.membership.updateMany({
    where: { userId: session.user.id },
    data: { isCurrent: false },
  })

  await prisma.membership.update({
    where: { id: membership.id },
    data: { isCurrent: true },
  })

  return { success: true }
}
