import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements, getRemainingCredits } from "@/lib/entitlements"
import { Card } from "@/components/app/card"
import { redirect } from "next/navigation"

export default async function UsagePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const orgId = session.user.orgId
  const entitlements = await resolveEntitlements(orgId)
  const remaining = await getRemainingCredits(orgId)
  const used = entitlements.creditsPerMonth - remaining

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const recentUsage = await prisma.usageRecord.findMany({
    where: { orgId, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const percentage = entitlements.creditsPerMonth > 0
    ? Math.round((used / entitlements.creditsPerMonth) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">Credits this month</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-foreground">{remaining}</p>
            <p className="text-sm text-muted-fg">of {entitlements.creditsPerMonth} remaining</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent usage</h2>
        {recentUsage.length === 0 ? (
          <p className="text-sm text-muted-fg">No usage recorded this month.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentUsage.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{record.suiteId}</p>
                  <p className="text-xs text-muted-fg">{record.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{record.credits} credits</p>
                  <p className="text-xs text-muted-fg">
                    {record.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
