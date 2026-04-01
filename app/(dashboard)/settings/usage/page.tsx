import { Badge } from "@/components/badge"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { getRemainingCredits, resolveEntitlements } from "@/lib/entitlements"
import { getServerTranslation } from "@/lib/i18n-server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { CSSProperties } from "react"
import rows from "@/components/stacked-rows/stacked-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./usage.module.scss"

export default async function UsagePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")
  const t = await getServerTranslation()

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
        title={t("settingsPages.monthlyPool")}
        subtitle={t("settingsPages.monthlyPoolDesc")}
        headerAside={<Badge>{t("settingsPages.remaining", { count: remaining })}</Badge>}
      >
        <div className={s.meta}>
          <span>{t("settingsPages.creditsUsedMonth", { count: Math.max(used, 0) })}</span>
          <span>{t("settingsPages.creditsTotalAllowance", { count: entitlements.creditsPerMonth })}</span>
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

      <SurfacePanel title={t("settingsPages.recentUsage")} subtitle={t("settingsPages.recentUsageDesc")}>
        {recentUsage.length === 0 ? (
          <EmptyPlaceholder
            title={t("settingsPages.noUsage")}
            description={t("settingsPages.noUsageDesc")}
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
