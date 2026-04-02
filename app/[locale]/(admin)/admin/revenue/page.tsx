import { Badge } from "@/components/badge"
import { SurfacePanel } from "@/components/surface-panel"
import { requireAdmin } from "@/lib/admin"
import { getAdminRevenue } from "@/server/actions/admin"
import s from "./revenue.module.scss"

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function statusVariant(status: string): "success" | undefined {
  if (status === "ACTIVE" || status === "TRIALING") return "success"
  return undefined
}

export default async function AdminRevenuePage() {
  await requireAdmin()
  const data = await getAdminRevenue()

  const stats = [
    { label: "MRR", value: formatCents(data.mrr), hint: "Monthly Recurring Revenue" },
    { label: "ARR", value: formatCents(data.arr), hint: "Annual run rate" },
    { label: "Active subs", value: String(data.activeCount), hint: `${data.totalSubscriptions} total` },
    { label: "Churned (month)", value: String(data.churnedThisMonth), hint: "Cancelled this month" },
    { label: "Manual access", value: String(data.manualAccessOrgs), hint: "Orgs with free/trial access" }
  ]

  return (
    <>
      <div className={s.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <span className={s.statLabel}>{stat.label}</span>
            <span className={s.statValue}>{stat.value}</span>
            <span className={s.statHint}>{stat.hint}</span>
          </div>
        ))}
      </div>

      <SurfacePanel spaced title="Revenue by plan" subtitle="Breakdown of active subscriptions by plan tier.">
        <div className={s.planBreakdown}>
          {data.planBreakdown.length > 0 ? data.planBreakdown.map((p) => (
            <div key={p.plan} className={s.planRow}>
              <span className={s.planName}>{p.name}</span>
              <span className={s.planCount}>{p.count} sub{p.count !== 1 ? "s" : ""}</span>
              <div className={s.planBar}>
                <div
                  className={s.planBarFill}
                  style={{ width: `${Math.min(100, (p.revenue / Math.max(1, data.mrr)) * 100)}%` }}
                />
              </div>
              <span className={s.planRevenue}>{formatCents(p.revenue)}/mo</span>
            </div>
          )) : (
            <span className={s.emptySmall}>No paid subscriptions yet.</span>
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel spaced title="All subscriptions" subtitle="Every Stripe subscription with full details.">
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>Organization</span>
            <span>Owner</span>
            <span>Plan</span>
            <span>Status</span>
            <span>Period end</span>
            <span>Members</span>
            <span>Jobs</span>
            <span>Stripe ID</span>
          </div>
          {data.subscriptions.map((sub) => (
            <div key={sub.id} className={s.tableRow}>
              <span className={s.orgName}>{sub.orgName}</span>
              <span className={s.ownerInfo}>
                <span className={s.ownerName}>{sub.ownerName}</span>
                <span className={s.ownerEmail}>{sub.ownerEmail}</span>
              </span>
              <span className={s.planKey}>{sub.planKey}</span>
              <span>
                <Badge variant={statusVariant(sub.status)}>
                  {sub.status.toLowerCase()}
                  {sub.cancelAtPeriodEnd ? " (cancelling)" : ""}
                </Badge>
              </span>
              <span className={s.date}>
                {sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span>{sub.memberCount}</span>
              <span>{sub.jobCount}</span>
              <span className={s.stripeId}>
                {sub.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${sub.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.stripeLink}
                  >
                    {sub.stripeSubscriptionId.slice(0, 18)}...
                  </a>
                ) : (
                  <span className={s.mono}>{sub.stripeSubscriptionId.slice(0, 18)}...</span>
                )}
              </span>
            </div>
          ))}
          {data.subscriptions.length === 0 && (
            <div className={s.empty}>No subscriptions yet.</div>
          )}
        </div>
      </SurfacePanel>
    </>
  )
}
