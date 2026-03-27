import { Badge } from "@/components/badge"
import { Plan } from "@/components/plan"
import planStyles from "@/components/plan/plan.module.scss"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import { auth } from "@/lib/auth"
import { getPlan, PLANS } from "@/lib/plans"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CheckoutButton, ManageBillingButton } from "./actions"
import s from "./billing.module.scss"

function formatMembers(limit: number) {
  if (limit === -1) return "Unlimited members"
  return `${limit} member${limit === 1 ? "" : "s"}`
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" }
  })

  const currentPlan = subscription ? getPlan(subscription.planKey) : null

  return (
    <>
      <SurfacePanel
        title={currentPlan?.name || "Free workspace"}
        subtitle={
          currentPlan
            ? `${currentPlan.creditsPerMonth} credits per month, ${formatMembers(currentPlan.maxMembers)}, ${currentPlan.suites.length} suite${currentPlan.suites.length === 1 ? "" : "s"} included.`
            : "No active subscription yet."
        }
        headerAside={
          subscription ? <Badge variant="success">{subscription.status.toLowerCase()}</Badge> : <Badge>Free</Badge>
        }
      >
        {subscription ? (
          <div className={info.row}>
            <label>Renews</label>
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
            <ManageBillingButton label="Open billing portal" />
          ) : (
            <CheckoutButton planKey="starter" label="Start with Starter" />
          )}
        </div>
      </SurfacePanel>

      <div className={s.planGrid}>
        {PLANS.map((plan) => {
          const isCurrent = subscription?.planKey === plan.key
          const tagline = `${plan.suites.length} suite${plan.suites.length === 1 ? "" : "s"} included, ${plan.creditsPerMonth} credits per month, ${formatMembers(plan.maxMembers)}.`
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
                        Most selected
                      </Badge>
                    ) : null}
                    {isCurrent ? (
                      <Badge className={planStyles.badge} variant="success">
                        Current plan
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
                    label={subscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
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
