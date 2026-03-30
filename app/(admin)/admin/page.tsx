import { Badge } from "@/components/badge"
import { SurfacePanel } from "@/components/surface-panel"
import { requireAdmin } from "@/lib/admin"
import { getAdminMetrics, getRecentSignups } from "@/server/actions/admin"
import s from "./dashboard.module.scss"

export default async function AdminDashboardPage() {
  await requireAdmin()

  const metrics = await getAdminMetrics()
  const recentUsers = await getRecentSignups(8)

  const stats = [
    { label: "Total users", value: String(metrics.totalUsers) },
    { label: "Organizations", value: String(metrics.totalOrgs) },
    { label: "Active subscriptions", value: String(metrics.activeSubscriptions) },
    { label: "New users (month)", value: String(metrics.newUsersThisMonth) },
    { label: "Active jobs", value: String(metrics.activeJobs) },
    { label: "Credits used (month)", value: String(metrics.creditsUsedThisMonth) }
  ]

  return (
    <>
      <div className={s.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <span className={s.statLabel}>{stat.label}</span>
            <span className={s.statValue}>{stat.value}</span>
          </div>
        ))}
      </div>

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
