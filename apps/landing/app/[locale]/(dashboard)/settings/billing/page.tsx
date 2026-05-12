import { Badge } from "@/components/badge"
import { Plan } from "@/components/plan"
import planStyles from "@/components/plan/plan.module.scss"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import { auth } from "@/lib/auth"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { CREDIT_PACKS, FREE_PLAN, getPlan, PLANS } from "@/lib/plans"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import {
  BuyCreditsButton,
  CancelSubscriptionButton,
  CheckoutButton,
  ManageBillingButton,
  ResumeSubscriptionButton,
} from "./actions"
import { CheckoutFeedback } from "../../dashboard/checkout-feedback"
import s from "./billing.module.scss"

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(d)
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect(await localeHref("/login"))
  const { t, locale } = await getServerTranslation()

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" }
  })

  const currentPlan = subscription ? getPlan(subscription.planKey) : null
  const entitlements = await resolveEntitlements(session.user.orgId)
  const remainingCreditsRaw = await getRemainingCredits(session.user.orgId)
  const totalCredits = entitlements.creditsPerMonth
  // UsageRecord.credits is a Decimal column — sums come back with float-
  // precision dust (e.g. 29.256499999999505). Round both sides for display
  // so the strip stays readable; internal accounting still uses raw values.
  const remainingCredits = Math.max(0, Math.round(remainingCreditsRaw))
  const usedCredits = Math.max(0, totalCredits - remainingCredits)
  const usedPct = totalCredits > 0 ? Math.min(100, Math.round((usedCredits / totalCredits) * 100)) : 0

  const formatMembers = (limit: number) =>
    limit === -1 ? t("settingsPages.unlimitedMembers") : t("settingsPages.memberCountPlural", { count: limit })

  const subtitle = (() => {
    const plan = currentPlan || FREE_PLAN
    const credits = t("settingsPages.creditsPerMonth", { count: plan.creditsPerMonth })
    const members = formatMembers(plan.maxMembers)
    const suites = plan.suites.length > 1
      ? t("settingsPages.suitesIncludedPlural", { count: plan.suites.length })
      : t("settingsPages.suitesIncluded", { count: plan.suites.length })
    return `${credits}, ${members}, ${suites}.`
  })()

  const statusBadge = (() => {
    if (!subscription) return <Badge>Free</Badge>
    if (subscription.cancelAtPeriodEnd) return <Badge variant="warning">{t("settingsPages.cancelsOn", { date: formatDate(subscription.currentPeriodEnd, locale) })}</Badge>
    return <Badge variant="success">{subscription.status.toLowerCase()}</Badge>
  })()

  return (
    <>
      <CheckoutFeedback />
      <SurfacePanel
        title={currentPlan?.name || FREE_PLAN.name}
        subtitle={subtitle}
        headerAside={statusBadge}
      >
        {/* Credits usage bar — works for both free and paid plans */}
        {totalCredits > 0 ? (
          <div className={s.creditsStrip}>
            <span className={s.used}>
              <strong>{usedCredits}</strong> / {totalCredits} {t("settingsPages.creditsUsedSuffix")}
            </span>
            <span className={s.label}>{usedPct}%</span>
            <div className={s.bar}><span style={{ width: `${usedPct}%` }} /></div>
          </div>
        ) : null}

        {subscription ? (
          <>
            <div className={info.row}>
              <label>{subscription.cancelAtPeriodEnd ? t("settingsPages.endsOn") : t("settingsPages.renews")}</label>
              <span>{formatDate(subscription.currentPeriodEnd, locale)}</span>
            </div>
            <div className={info.row}>
              <label>{t("settingsPages.startedOn")}</label>
              <span>{formatDate(subscription.currentPeriodStart, locale)}</span>
            </div>
          </>
        ) : null}

        <div className={s.actions}>
          {subscription ? (
            <>
              <ManageBillingButton label={t("settingsPages.openBillingPortal")} />
              {subscription.cancelAtPeriodEnd
                ? <ResumeSubscriptionButton />
                : <CancelSubscriptionButton />}
            </>
          ) : (
            <CheckoutButton planKey="starter" label={t("settingsPages.startWithStarter")} />
          )}
        </div>
      </SurfacePanel>

      {/* Extra credit packs — only shown to users with an active subscription
          (free-plan users should upgrade their plan first). */}
      {subscription ? (
        <>
          <h2 className={s.sectionHeading}>{t("settingsPages.buyExtraCredits")}</h2>
          <div className={s.packGrid}>
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.key} className={`${s.packCard} ${pack.popular ? s.popular : ""}`}>
                <span className={s.packCredits}>+{pack.credits} {t("settingsPages.credits")}</span>
                <span className={s.packPrice}>${(pack.priceCents / 100).toFixed(0)} {t("settingsPages.oneTime")}</span>
                <div className={s.packCta}>
                  <BuyCreditsButton
                    packKey={pack.key}
                    label={t("settingsPages.buy", { credits: pack.credits })}
                    variant={pack.popular ? "primary" : "secondary"}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <h2 className={s.sectionHeading}>{t("settingsPages.allPlans")}</h2>
      <div className={s.planGrid}>
        {PLANS.map((plan) => {
          const isCurrent = subscription?.planKey === plan.key
          const tagline = `${t("settingsPages.creditsPerMonth", { count: plan.creditsPerMonth })}, ${formatMembers(plan.maxMembers)}.`
          const showBadges = plan.popular || isCurrent

          return (
            <Plan
              key={plan.key}
              withReveal={false}
              name={plan.name}
              tagline={tagline}
              features={plan.features}
              recommended={Boolean(plan.popular)}
              titleBadge={plan.popular ? null : undefined}
              price={`$${(plan.monthlyPrice / 100).toFixed(0)}`}
              priceSuffix="per month"
              badges={
                showBadges ? (
                  <>
                    {plan.popular ? (
                      <Badge className={planStyles.badge} variant="popular">
                        {t("settingsPages.mostSelected")}
                      </Badge>
                    ) : null}
                    {isCurrent ? (
                      <Badge className={planStyles.badge} variant="success">
                        {t("settingsPages.currentPlan")}
                      </Badge>
                    ) : null}
                  </>
                ) : undefined
              }
              action={
                isCurrent ? (
                  <ManageBillingButton />
                ) : (
                  <CheckoutButton
                    planKey={plan.key}
                    label={subscription ? t("settingsPages.switchTo", { plan: plan.name }) : t("settingsPages.choose", { plan: plan.name })}
                  />
                )
              }
            />
          )
        })}
      </div>
    </>
  )
}
