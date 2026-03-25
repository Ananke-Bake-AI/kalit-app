import { Avatar } from "@/components/avatar"
import { Badge } from "@/components/badge"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { resolveEntitlements } from "@/lib/entitlements"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import rows from "@/components/stacked-rows/stacked-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./team.module.scss"

function formatSeats(limit: number) {
  if (limit === -1) return "Unlimited seats"
  return `${limit} seat${limit === 1 ? "" : "s"}`
}

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const [members, entitlements] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: session.user.orgId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    resolveEntitlements(session.user.orgId),
  ])

  const seatsLabel = formatSeats(entitlements.maxMembers)

  return (
    <SurfacePanel
      title="Members"
      subtitle="Members in this workspace and current seat usage."
      headerAside={
        <Badge>
          {members.length} / {seatsLabel}
        </Badge>
      }
    >
      {members.length === 0 ? (
        <EmptyPlaceholder
          title="No team members yet"
          description="Add collaborators when you want to work together in this workspace."
        />
      ) : (
        members.map((member) => (
          <div key={member.id} className={rows.row}>
            <div className={s.memberLead}>
              <Avatar className={s.teamAvatar} name={member.user.name || member.user.email} />
              <div className={rows.main}>
                <div className={rows.title}>{member.user.name || member.user.email}</div>
                <div className={rows.subtitle}>{member.user.email}</div>
              </div>
            </div>
            <span className={rows.meta}>{member.role}</span>
          </div>
        ))
      )}
    </SurfacePanel>
  )
}
