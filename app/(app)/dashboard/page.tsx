import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import { redirect } from "next/navigation"
import { SuiteGrid } from "@/components/app/suite-grid"
import { QuickStats } from "@/components/app/quick-stats"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { org: true },
  })

  if (!membership) redirect("/setup")

  const entitlements = await resolveEntitlements(membership.orgId)
  const credits = await getRemainingCredits(membership.orgId)

  const memberCount = await prisma.membership.count({
    where: { orgId: membership.orgId },
  })

  const jobCount = await prisma.job.count({
    where: { orgId: membership.orgId, status: { in: ["RUNNING", "QUEUED"] } },
  })

  const enabledSuites = (Object.entries(entitlements.suites)
    .filter(([, v]) => v)
    .map(([k]) => k)) as SuiteId[]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Welcome back. Here&apos;s your workspace overview.
        </p>
      </div>

      <QuickStats
        credits={credits}
        maxCredits={entitlements.creditsPerMonth}
        activeJobs={jobCount}
        teamMembers={memberCount}
        planKey={entitlements.planKey}
      />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Your suites</h2>
        <SuiteGrid enabledSuites={enabledSuites} />
      </div>
    </div>
  )
}
