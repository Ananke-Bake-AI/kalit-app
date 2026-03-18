import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/app/card"
import { Badge } from "@/components/app/badge"
import { redirect } from "next/navigation"

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const members = await prisma.membership.findMany({
    where: { orgId: session.user.orgId },
    include: { user: { select: { name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  const invitations = await prisma.invitation.findMany({
    where: { orgId: session.user.orgId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Team members ({members.length})
        </h2>
        <div className="flex flex-col divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {m.user.name || m.user.email}
                </p>
                <p className="text-xs text-muted-fg">{m.user.email}</p>
              </div>
              <Badge>{m.role.toLowerCase()}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Pending invitations ({invitations.length})
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-fg">
                    Expires {inv.expiresAt.toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="warning">pending</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
