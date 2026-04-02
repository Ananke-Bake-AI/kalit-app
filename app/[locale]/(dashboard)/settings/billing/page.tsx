import { Badge } from "@/components/badge"
import { Plan } from "@/components/plan"
import planStyles from "@/components/plan/plan.module.scss"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import { auth } from "@/lib/auth"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { getPlan, PLANS } from "@/lib/plans"
import { prisma } from "@/lib/prisma"
import { CheckoutButton, ManageBillingButton } from "./actions"
import s from "./billing.module.scss"

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" }
  })

  const currentPlan = subscription ? getPlan(subscription.planKey) : null

  const formatMembers = (limit: number) =>
    limit === -1 ? t("settingsPages.unlimitedMembers") : t("settingsPages.memberCountPlural", { count: limit })

  return (
    <>
      <SurfacePanel
        title={currentPlan?.name || t("settingsPages.freeWorkspace")}
        subtitle={
          currentPlan
            ? `${t("settingsPages.creditsPerMonth", { count: currentPlan.creditsPerMonth })}, ${formatMembers(currentPlan.maxMembers)}, ${currentPlan.suites.length > 1 ? t("settingsPages.suitesIncludedPlural", { count: currentPlan.suites.length }) : t("settingsPages.suitesIncluded", { count: currentPlan.suites.length })}.`
            : t("settingsPages.noSubscription")
        }
        headerAside={
          subscription ? <Badge variant="success">{subscription.status.toLowerCase()}</Badge> : <Badge>Free</Badge>
        }
      >
        {subscription ? (
          <div className={info.row}>
            <label>{t("settingsPages.renews")}</label>
            <span>
              {subscription.currentPeriodEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
        ) : null}
        <div className={s.actions}>
          {subscription ? (
            <ManageBillingButton label={t("settingsPages.openBillingPortal")} />
          ) : (
            <CheckoutButton planKey="starter" label={t("settingsPages.startWithStarter")} />
          )}
        </div>
      </SurfacePanel>

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
