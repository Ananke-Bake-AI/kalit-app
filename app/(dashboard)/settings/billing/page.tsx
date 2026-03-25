import { Badge } from "@/components/badge"
import { auth } from "@/lib/auth"
import { getPlan, PLANS } from "@/lib/plans"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SurfacePanel } from "@/components/surface-panel"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
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
    orderBy: { createdAt: "desc" },
  })

  const currentPlan = subscription ? getPlan(subscription.planKey) : null

  return (
    <>
      <SurfacePanel
        spaced
        title={currentPlan?.name || "Free workspace"}
        subtitle={
          currentPlan
            ? `${currentPlan.creditsPerMonth} credits per month, ${formatMembers(currentPlan.maxMembers)}, ${currentPlan.suites.length} suite${currentPlan.suites.length === 1 ? "" : "s"} included.`
            : "No active subscription yet."
        }
        headerAside={
          subscription ? (
            <Badge variant="success">{subscription.status.toLowerCase()}</Badge>
          ) : (
            <Badge>Free</Badge>
          )
        }
      >
        {subscription ? (
          <div className={info.row}>
            <label>Renews</label>
            <span>
              {subscription.currentPeriodEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
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

          return (
            <div key={plan.key} className={`${s.planCard} ${plan.popular ? s.planFeatured : ""}`}>
              {plan.popular ? <Badge variant="popular">Most selected</Badge> : null}
              {isCurrent ? <Badge variant="success">Current plan</Badge> : null}
              <div>
                <h2 className={s.planTitle}>{plan.name}</h2>
                <p className={s.planSubtitle}>
                  {plan.suites.length} suite{plan.suites.length === 1 ? "" : "s"} included,{" "}
                  {plan.creditsPerMonth} credits per month, {formatMembers(plan.maxMembers)}.
                </p>
              </div>
              <div className={s.price}>
                ${(plan.monthlyPrice / 100).toFixed(0)}
                <small>/ month</small>
              </div>
              <ul className={s.planList}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {isCurrent ? (
                <ManageBillingButton />
              ) : (
                <CheckoutButton
                  planKey={plan.key}
                  label={subscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                  variant={plan.popular ? "primary" : "secondary"}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
