import { Badge } from "@/components/badge"
import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import { auth } from "@/lib/auth"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { CSSProperties } from "react"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./dashboard.module.scss"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { org: true }
  })

  if (!membership) {
    // Reset onboardingDone so the middleware won't bounce /setup back here
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingDone: false },
    })
    redirect(await localeHref("/setup"))
  }

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

  const formatMemberLimit = (limit: number) =>
    limit === -1 ? t("dashboard.unlimitedSeats") : `${limit} ${t("dashboard.seats")}`

  const stats = [
    {
      label: t("dashboard.currentPlan"),
      value: entitlements.planKey
        ? entitlements.planKey.charAt(0).toUpperCase() + entitlements.planKey.slice(1)
        : entitlements.isTrial ? t("dashboard.freeTrial") : enabledSuites.length > 0 ? "Custom" : "Free",
      hint: entitlements.isTrial && entitlements.trialExpiresAt
        ? t("dashboard.trialHint", { date: entitlements.trialExpiresAt.toLocaleDateString() })
        : t("dashboard.currentPlanHint")
    },
    {
      label: t("dashboard.creditsRemaining"),
      value: `${credits} / ${entitlements.creditsPerMonth}`,
      hint: t("dashboard.creditsHint")
    },
    {
      label: t("dashboard.activeJobs"),
      value: String(jobCount),
      hint: t("dashboard.jobsHint")
    },
    {
      label: t("dashboard.teamSeats"),
      value: `${memberCount} / ${formatMemberLimit(entitlements.maxMembers)}`,
      hint: t("dashboard.seatsHint")
    }
  ]

  const quickLinks = [
    { href: "/studio", label: t("dashboard.studioLabel"), value: t("dashboard.studioDesc") },
    { href: "/settings/profile", label: t("nav.profile"), value: t("dashboard.profileDesc") },
    { href: "/settings/billing", label: t("nav.billing"), value: t("dashboard.billingDesc") },
    { href: "/settings/team", label: t("dashboard.teamLabel"), value: t("dashboard.teamDesc") },
    { href: "/settings/usage", label: t("dashboard.usageLabel"), value: t("dashboard.usageDesc") }
  ]

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.welcomeBack", { orgName: membership.org.name })}
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
          title={t("dashboard.shortcuts")}
          subtitle={t("dashboard.shortcutsDesc")}
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

        <h2 className={s.sectionTitle}>{t("dashboard.yourSuites")}</h2>
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
                  <h3 className={s.suiteHeading}>{suite.name} {t("dashboard.suiteSuffix")}</h3>
                  <p className={s.suiteBlurb}>{t(`suites.${suite.id}DescLong`)}</p>
                  <span className={s.suiteAction}>{t("dashboard.openSuite")}</span>
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
                <Badge>{t("dashboard.locked")}</Badge>
                <h3 className={s.suiteHeading}>{suite.name} {t("dashboard.suiteSuffix")}</h3>
                <p className={s.suiteBlurb}>{t(`suites.${suite.id}DescLong`)}</p>
                <Link href="/settings/billing" className={s.suiteAction}>
                  {t("dashboard.upgradeToUnlock")}
                </Link>
              </div>
            )
          })}
        </div>
      </Container>
    </PageSection>
  )
}
