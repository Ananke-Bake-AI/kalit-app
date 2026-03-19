import { Container } from "@/components/container"
import { Logo } from "@/components/logo"
import { auth } from "@/lib/auth"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import Link from "next/link"
import { redirect } from "next/navigation"
import s from "../app.module.scss"

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
    .filter(([, enabled]) => enabled)
    .map(([suiteId]) => suiteId)) as SuiteId[]

  const stats = [
    {
      label: "Current plan",
      value: entitlements.planKey
        ? entitlements.planKey.charAt(0).toUpperCase() + entitlements.planKey.slice(1)
        : enabledSuites.length > 0 ? "Custom" : "Free",
      hint: "Billing, access, and execution limits stay synced here.",
    },
    {
      label: "Credits remaining",
      value: `${credits} / ${entitlements.creditsPerMonth}`,
      hint: "Available for this calendar month.",
    },
    {
      label: "Active jobs",
      value: String(jobCount),
      hint: "Queued or currently running across the suite.",
    },
    {
      label: "Team seats",
      value: `${memberCount} / ${formatMemberLimit(entitlements.maxMembers)}`,
      hint: "Owners, editors, and collaborators in this workspace.",
    },
  ]

  const quickLinks = [
    {
      href: "/settings/profile",
      label: "Profile",
      value: "Update your account details and sign-in preferences.",
    },
    {
      href: "/settings/billing",
      label: "Billing",
      value: "Manage plans, subscription status, and upgrades.",
    },
    {
      href: "/settings/team",
      label: "Team",
      value: "Review seats, roles, and workspace access.",
    },
    {
      href: "/settings/usage",
      label: "Usage",
      value: "Track credits and recent activity.",
    },
  ]

  return (
    <section className={s.page}>
      <Container>
        <div className={s.pageHeader}>
          <h1>Dashboard</h1>
          <p>Welcome back to {membership.org.name}. Check your plan, usage, jobs, and available suites.</p>
        </div>

        <div className={s.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={s.statCard}>
              <span className={s.statLabel}>{stat.label}</span>
              <span className={s.statValue}>{stat.value}</span>
              <span className={s.statHint}>{stat.hint}</span>
            </div>
          ))}
        </div>

        <div className={s.panel} style={{ marginBottom: "var(--spacing-1-5)" }}>
          <div className={s.panelHeader}>
            <div>
              <h2 className={s.panelTitle}>Shortcuts</h2>
              <p className={s.panelSubtitle}>Go straight to the account, billing, team, and usage controls you are most likely to need next.</p>
            </div>
          </div>
          <div className={s.quickGrid}>
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className={s.quickCard}>
                  <span className={s.quickLabel}>{link.label}</span>
                  <span className={s.quickValue}>{link.value}</span>
                </Link>
              ))}
            </div>
        </div>

        <h2 className={s.sectionTitle}>Your Kalit suites</h2>
        <div className={s.suitesGrid}>
          {SUITES.map((suite) => {
            const isEnabled = enabledSuites.includes(suite.id)

            if (isEnabled) {
              return (
                <Link key={suite.id} href={suite.href} className={s.suiteCard}>
                  <div className={s.suiteIcon} style={{ color: suite.color }}>
                    <Logo id={suite.id} />
                  </div>
                  <span className={s.badge}>Kalit {suite.name}</span>
                  <h3 className={s.cardTitle}>{suite.name} suite</h3>
                  <p className={s.panelSubtitle}>{suite.description}</p>
                  <span className={s.suiteAction} style={{ color: suite.color }}>
                    Open suite
                  </span>
                </Link>
              )
            }

            return (
              <div key={suite.id} className={`${s.suiteCard} ${s.locked}`}>
                <div className={s.suiteIcon} style={{ color: suite.color }}>
                  <Logo id={suite.id} />
                </div>
                <span className={s.badge}>Locked</span>
                <h3 className={s.cardTitle}>{suite.name} suite</h3>
                <p className={s.panelSubtitle}>{suite.description}</p>
                <Link href="/settings/billing" className={s.suiteAction}>
                  Upgrade to unlock
                </Link>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
