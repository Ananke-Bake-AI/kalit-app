import { Avatar } from "@/components/avatar"
import { Badge } from "@/components/badge"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { resolveEntitlements } from "@/lib/entitlements"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import rows from "@/components/stacked-rows/stacked-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"
import s from "./team.module.scss"

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const [members, entitlements] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: session.user.orgId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    resolveEntitlements(session.user.orgId),
  ])

  const seatsLabel = entitlements.maxMembers === -1
    ? t("settingsPages.unlimitedMembers")
    : `${entitlements.maxMembers} ${t("dashboard.seats")}`

  return (
    <SurfacePanel
      title={t("settingsPages.members")}
      subtitle={t("settingsPages.membersDesc")}
      headerAside={
        <Badge>
          {members.length} / {seatsLabel}
        </Badge>
      }
    >
      {members.length === 0 ? (
        <EmptyPlaceholder
          title={t("settingsPages.noMembers")}
          description={t("settingsPages.noMembersDesc")}
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
