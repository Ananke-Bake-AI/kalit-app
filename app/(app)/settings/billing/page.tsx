import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements } from "@/lib/entitlements"
import { PLANS } from "@/lib/plans"
import { Card } from "@/components/app/card"
import { Badge } from "@/components/app/badge"
import { redirect } from "next/navigation"
import { BillingActions } from "./actions"

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const entitlements = await resolveEntitlements(session.user.orgId)

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">Current plan</h2>
        {subscription ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-foreground capitalize">{subscription.planKey}</p>
              <Badge variant="success">{subscription.status.toLowerCase()}</Badge>
            </div>
            <p className="text-sm text-muted-fg">
              Current period: {subscription.currentPeriodStart.toLocaleDateString()} — {subscription.currentPeriodEnd.toLocaleDateString()}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-yellow-400">Cancels at end of period</p>
            )}
            <BillingActions hasSubscription={true} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-fg">No active subscription</p>
            <BillingActions hasSubscription={false} />
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Available plans</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={`relative ${plan.popular ? "border-accent" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 right-4 bg-accent text-white">Popular</Badge>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-foreground">
                ${(plan.monthlyPrice / 100).toFixed(0)}
                <span className="text-sm font-normal text-muted-fg">/mo</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-fg">
                    <span className="text-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
