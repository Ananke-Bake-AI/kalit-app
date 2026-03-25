import { Badge } from "@/components/badge"
import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import { auth } from "@/lib/auth"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { CSSProperties } from "react"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./dashboard.module.scss"

function formatMemberLimit(limit: number) {
  if (limit === -1) {
    return "Unlimited seats"
  }

  return `${limit} seat${limit === 1 ? "" : "s"}`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { org: true }
  })

  if (!membership) redirect("/setup")

  const entitlements = await resolveEntitlements(membership.orgId)
  const credits = await getRemainingCredits(membership.orgId)
  const memberCount = await prisma.membership.count({
    where: { orgId: membership.orgId }
  })
  const jobCount = await prisma.job.count({
    where: { orgId: membership.orgId, status: { in: ["RUNNING", "QUEUED"] } }
  })

  const enabledSuites = Object.entries(entitlements.suites)
    .filter(([, enabled]) => enabled)
    .map(([suiteId]) => suiteId) as SuiteId[]

  const stats = [
    {
      label: "Current plan",
      value: entitlements.planKey
        ? entitlements.planKey.charAt(0).toUpperCase() + entitlements.planKey.slice(1)
        : enabledSuites.length > 0
          ? "Custom"
          : "Free",
      hint: "Billing, access, and execution limits stay synced here."
    },
    {
      label: "Credits remaining",
      value: `${credits} / ${entitlements.creditsPerMonth}`,
      hint: "Available for this calendar month."
    },
    {
      label: "Active jobs",
      value: String(jobCount),
      hint: "Queued or currently running across the suite."
    },
    {
      label: "Team seats",
      value: `${memberCount} / ${formatMemberLimit(entitlements.maxMembers)}`,
      hint: "Owners, editors, and collaborators in this workspace."
    }
  ]

  const quickLinks = [
    {
      href: "/settings/profile",
      label: "Profile",
      value: "Update your account details and sign-in preferences."
    },
    {
      href: "/settings/billing",
      label: "Billing",
      value: "Manage plans, subscription status, and upgrades."
    },
    {
      href: "/settings/team",
      label: "Team",
      value: "Review seats, roles, and workspace access."
    },
    {
      href: "/settings/usage",
      label: "Usage",
      value: "Track credits and recent activity."
    }
  ]

  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Dashboard"
          description={`Welcome back to ${membership.org.name}. Check your plan, usage, jobs, and available suites.`}
        />

        <div className={s.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={s.statCard}>
              <span className={s.statLabel}>{stat.label}</span>
              <span className={s.statValue}>{stat.value}</span>
              <span className={s.statHint}>{stat.hint}</span>
            </div>
          ))}
        </div>

        <SurfacePanel
          spaced
          title="Shortcuts"
          subtitle="Go straight to the account, billing, team, and usage controls you are most likely to need next."
        >
          <div className={s.quickGrid}>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className={s.quickCard}>
                <span className={s.quickLabel}>{link.label}</span>
                <span className={s.quickValue}>{link.value}</span>
              </Link>
            ))}
          </div>
        </SurfacePanel>

        <h2 className={s.sectionTitle}>Your Kalit suites</h2>
        <div className={s.suitesGrid}>
          {SUITES.map((suite) => {
            const isEnabled = enabledSuites.includes(suite.id)

            if (isEnabled) {
              return (
                <Link
                  key={suite.id}
                  href={suite.href}
                  className={s.suiteCard}
                  style={{ "--suite-color": suite.color } as CSSProperties}
                >
                  <div className={s.suiteIcon}>
                    <Logo id={suite.id} />
                  </div>
                  <Badge>Kalit {suite.name}</Badge>
                  <h3 className={s.suiteHeading}>{suite.name} suite</h3>
                  <p className={s.suiteBlurb}>{suite.description}</p>
                  <span className={s.suiteAction}>Open suite</span>
                </Link>
              )
            }

            return (
              <div
                key={suite.id}
                className={`${s.suiteCard} ${s.locked}`}
                style={{ "--suite-color": suite.color } as CSSProperties}
              >
                <div className={s.suiteIcon}>
                  <Logo id={suite.id} />
                </div>
                <Badge>Locked</Badge>
                <h3 className={s.suiteHeading}>{suite.name} suite</h3>
                <p className={s.suiteBlurb}>{suite.description}</p>
                <Link href="/settings/billing" className={s.suiteAction}>
                  Upgrade to unlock
                </Link>
              </div>
            )
          })}
        </div>
      </Container>
    </PageSection>
  )
}
