import { SurfacePanel } from "@/components/surface-panel"
import { requireAdmin } from "@/lib/admin"
import { getAdminMetrics, getRecentSignups } from "@/server/actions/admin"
import s from "./dashboard.module.scss"
import { QuickAssign } from "./quick-assign"

export default async function AdminDashboardPage() {
  await requireAdmin()

  const metrics = await getAdminMetrics()
  const recentUsers = await getRecentSignups(10)

  const growthPct = metrics.newUsersLastMonth > 0
    ? Math.round(((metrics.newUsersThisMonth - metrics.newUsersLastMonth) / metrics.newUsersLastMonth) * 100)
    : metrics.newUsersThisMonth > 0 ? 100 : 0

  const creditsDelta = metrics.creditsUsedLastMonth > 0
    ? Math.round(((metrics.creditsUsedThisMonth - metrics.creditsUsedLastMonth) / metrics.creditsUsedLastMonth) * 100)
    : 0

  const stats = [
    { label: "Total users", value: String(metrics.totalUsers), hint: `+${metrics.newUsersToday} today` },
    { label: "New this month", value: String(metrics.newUsersThisMonth), hint: growthPct >= 0 ? `+${growthPct}% vs last month` : `${growthPct}% vs last month` },
    { label: "This week", value: String(metrics.newUsersThisWeek), hint: "Last 7 days" },
    { label: "Organizations", value: String(metrics.totalOrgs), hint: `${metrics.activeSubscriptions} paid` },
    { label: "Active trials", value: String(metrics.activeTrials), hint: "Not expired" },
    { label: "Active jobs", value: String(metrics.activeJobs), hint: `${metrics.completedJobs} done / ${metrics.failedJobs} failed` },
    { label: "Credits used", value: String(metrics.creditsUsedThisMonth), hint: creditsDelta >= 0 ? `+${creditsDelta}% vs last month` : `${creditsDelta}% vs last month` },
    { label: "API calls", value: String(metrics.totalUsageRecords), hint: "This month" }
  ]

  return (
    <>
      <div className={s.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <span className={s.statLabel}>{stat.label}</span>
            <span className={s.statValue}>{stat.value}</span>
            {stat.hint && <span className={s.statHint}>{stat.hint}</span>}
          </div>
        ))}
      </div>

      <div className={s.twoCol}>
        <SurfacePanel spaced title="Credits by suite" subtitle="Usage breakdown this month.">
          <div className={s.suiteBreakdown}>
            {metrics.creditsBySuite.length > 0 ? metrics.creditsBySuite.map((r) => (
              <div key={r.suite} className={s.suiteRow}>
                <span className={s.suiteName}>{r.suite}</span>
                <div className={s.suiteBar}>
                  <div
                    className={s.suiteBarFill}
                    style={{ width: `${Math.min(100, (r.credits / Math.max(1, metrics.creditsUsedThisMonth)) * 100)}%` }}
                  />
                </div>
                <span className={s.suiteCredits}>{r.credits}</span>
              </div>
            )) : (
              <span className={s.emptySmall}>No usage yet this month.</span>
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel spaced title="Signups (7 days)" subtitle="Daily new user registrations.">
          <div className={s.chartGrid}>
            {Object.entries(metrics.signupsByDay).map(([date, count]) => {
              const maxCount = Math.max(1, ...Object.values(metrics.signupsByDay))
              return (
                <div key={date} className={s.chartCol}>
                  <div className={s.chartBarWrap}>
                    <div className={s.chartBar} style={{ height: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className={s.chartLabel}>{new Date(date).toLocaleDateString("en", { weekday: "short" })}</span>
                  <span className={s.chartValue}>{count}</span>
                </div>
              )
            })}
          </div>
        </SurfacePanel>
      </div>

      <QuickAssign />

      <SurfacePanel spaced title="Recent signups" subtitle="Latest users who joined the platform.">
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>Name</span>
            <span>Email</span>
            <span>Organization</span>
            <span>Joined</span>
          </div>
          {recentUsers.map((user) => (
            <div key={user.id} className={s.tableRow}>
              <span className={s.name}>{user.name || "—"}</span>
              <span className={s.email}>{user.email}</span>
              <span>{user.memberships[0]?.org?.name || "—"}</span>
              <span className={s.date}>{user.createdAt.toLocaleDateString()}</span>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <div className={s.empty}>No users yet.</div>
          )}
        </div>
      </SurfacePanel>
    </>
  )
}
