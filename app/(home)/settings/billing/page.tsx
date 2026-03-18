import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PLANS } from "@/lib/plans"
import { redirect } from "next/navigation"
import { BillingActions } from "./actions"
import s from "../../app.module.scss"

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <>
      <div className={s.card}>
        <h2 className={s.cardTitle}>Current plan</h2>
        {subscription ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.25em", textTransform: "capitalize" }}>
                {subscription.planKey}
              </span>
              <span className={`${s.badge} ${s.success}`}>{subscription.status.toLowerCase()}</span>
            </div>
            <p style={{ fontSize: "0.85em", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Current period: {subscription.currentPeriodStart.toLocaleDateString()} — {subscription.currentPeriodEnd.toLocaleDateString()}
            </p>
            <BillingActions hasSubscription={true} />
          </>
        ) : (
          <>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>No active subscription</p>
            <BillingActions hasSubscription={false} />
          </>
        )}
      </div>

      <h2 className={s.sectionTitle} style={{ marginTop: "var(--spacing-1-5)" }}>Available plans</h2>
      <div className={s.planGrid}>
        {PLANS.map((plan) => (
          <div key={plan.key} className={`${s.planCard} ${plan.popular ? s.popular : ""}`}>
            {plan.popular && <span className={`${s.badge} ${s.popular}`}>Popular</span>}
            <h3>{plan.name}</h3>
            <div className={s.price}>
              ${(plan.monthlyPrice / 100).toFixed(0)}<small>/mo</small>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
