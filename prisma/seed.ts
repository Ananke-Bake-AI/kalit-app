import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create a test user
  const hashedPassword = await bcrypt.hash("password123", 12)
  const user = await prisma.user.upsert({
    where: { email: "test@kalit.ai" },
    update: {},
    create: {
      email: "test@kalit.ai",
      name: "Test User",
      hashedPassword,
      onboardingDone: true,
    },
  })

  // Create a test organization
  const org = await prisma.organization.upsert({
    where: { slug: "test-workspace" },
    update: {},
    create: {
      name: "Test Workspace",
      slug: "test-workspace",
    },
  })

  // Create membership
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { isCurrent: true },
    create: {
      userId: user.id,
      orgId: org.id,
      role: "OWNER",
      isCurrent: true,
    },
  })

  // Grant all suites for testing
  const suites = ["project", "flow", "marketing", "pentest"]
  for (const suiteId of suites) {
    await prisma.entitlement.upsert({
      where: { orgId_key: { orgId: org.id, key: `suite.${suiteId}.access` } },
      update: {},
      create: {
        orgId: org.id,
        key: `suite.${suiteId}.access`,
        value: { granted: true },
        source: "MANUAL",
      },
    })
  }

  // Grant credits
  await prisma.entitlement.upsert({
    where: { orgId_key: { orgId: org.id, key: "monthly.credits" } },
    update: {},
    create: {
      orgId: org.id,
      key: "monthly.credits",
      value: { amount: 500 },
      source: "MANUAL",
    },
  })

  console.log("Seed completed.")
  console.log("Test login: test@kalit.ai / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
