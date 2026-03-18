import { Container } from "@/components/container"
import { Logo } from "@/components/logo"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"
import { SUITES } from "@/lib/suites"
import { redirect } from "next/navigation"
import Link from "next/link"
import s from "../app.module.scss"
import type { SuiteId } from "@/lib/app-suites"

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

  const stats = [
    { label: "Current plan", value: entitlements.planKey ? entitlements.planKey.charAt(0).toUpperCase() + entitlements.planKey.slice(1) : "Free" },
    { label: "Credits remaining", value: `${credits} / ${entitlements.creditsPerMonth}` },
    { label: "Active jobs", value: String(jobCount) },
    { label: "Team members", value: String(memberCount) },
  ]

  return (
    <section className={s.page}>
      <Container>
        <div className={s.pageHeader}>
          <h1>Dashboard</h1>
          <p>Welcome back to {membership.org.name}. Here&apos;s your workspace overview.</p>
        </div>

        <div className={s.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={s.statCard}>
              <div>
                <div className={s.statLabel}>{stat.label}</div>
                <div className={s.statValue}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className={s.sectionTitle}>Your suites</h2>
        <div className={s.suitesGrid}>
          {SUITES.map((suite) => {
            const isEnabled = enabledSuites.includes(suite.id as SuiteId)

            if (isEnabled) {
              return (
                <Link key={suite.id} href={`/${suite.id}`} className={s.suiteCard}>
                  <div className={s.suiteIcon} style={{ color: suite.color }}>
                    <Logo id={suite.id} />
                  </div>
                  <h3>Kalit {suite.title}</h3>
                  <p>{suite.description}</p>
                  <div className={s.suiteAction} style={{ color: suite.color }}>
                    Open suite →
                  </div>
                </Link>
              )
            }

            return (
              <div key={suite.id} className={`${s.suiteCard} ${s.locked}`}>
                <div className={s.suiteIcon}>
                  <Logo id={suite.id} />
                </div>
                <h3>Kalit {suite.title}</h3>
                <p>{suite.description}</p>
                <Link href="/settings/billing" className={s.suiteAction}>
                  🔒 Upgrade to unlock
                </Link>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
