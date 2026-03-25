import { Badge } from "@/components/badge"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { CSSProperties } from "react"
import rows from "@/components/stacked-rows/stacked-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./usage.module.scss"

export default async function UsagePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const orgId = session.user.orgId
  const entitlements = await resolveEntitlements(orgId)
  const remaining = await getRemainingCredits(orgId)
  const used = entitlements.creditsPerMonth - remaining
  const percentage = entitlements.creditsPerMonth > 0
    ? Math.round((used / entitlements.creditsPerMonth) * 100)
    : 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const recentUsage = await prisma.usageRecord.findMany({
    where: { orgId, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <>
      <SurfacePanel
        title="Monthly credit pool"
        subtitle="Credits used and remaining this month."
        headerAside={<Badge>{remaining} remaining</Badge>}
      >
        <div className={s.meta}>
          <span>{Math.max(used, 0)} credits used this month</span>
          <span>{entitlements.creditsPerMonth} credits total allowance</span>
        </div>
        <div className={s.bar}>
          <div
            className={s.fill}
            style={
              { "--usage-fill-pct": `${Math.min(percentage, 100)}%` } as CSSProperties
            }
          />
        </div>
      </SurfacePanel>

      <SurfacePanel title="Recent usage" subtitle="Recent activity for this month.">
        {recentUsage.length === 0 ? (
          <EmptyPlaceholder
            title="No usage recorded yet"
            description="Usage will appear here once this workspace starts running actions."
          />
        ) : (
          <div className={s.history}>
            {recentUsage.map((record) => (
              <div key={record.id} className={rows.row}>
                <div className={rows.main}>
                  <div className={rows.title}>{record.suiteId}</div>
                  <div className={rows.subtitle}>{record.action}</div>
                </div>
                <span className={rows.meta}>{record.credits} credits</span>
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </>
  )
}
