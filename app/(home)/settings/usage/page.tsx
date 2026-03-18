import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"

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
      <div className={s.card}>
        <h2 className={s.cardTitle}>Credits this month</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "2em", color: "var(--text)" }}>{remaining}</span>
          <span style={{ fontSize: "0.85em", color: "var(--text-secondary)" }}>of {entitlements.creditsPerMonth} remaining</span>
        </div>
        <div className={s.usageBar}>
          <div className={s.fill} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      </div>

      {recentUsage.length > 0 && (
        <div className={s.card} style={{ marginTop: "var(--spacing-1)" }}>
          <h2 className={s.cardTitle}>Recent usage</h2>
          {recentUsage.map((record) => (
            <div key={record.id} className={s.memberRow}>
              <div className={s.memberInfo}>
                <div className={s.memberName} style={{ textTransform: "capitalize" }}>{record.suiteId}</div>
                <div className={s.memberEmail}>{record.action}</div>
              </div>
              <span style={{ fontSize: "0.85em", color: "var(--text)" }}>{record.credits} credits</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
