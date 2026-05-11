import { auth } from "@/lib/auth"
import { resolveEntitlements } from "@/lib/entitlements"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TeamClient } from "./team-client"

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const [members, invitations, entitlements, currentMembership] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: session.user.orgId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: {
        orgId: session.user.orgId,
        status: { in: ["PENDING", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    resolveEntitlements(session.user.orgId),
    prisma.membership.findUnique({
      where: {
        userId_orgId: { userId: session.user.id, orgId: session.user.orgId },
      },
      select: { role: true },
    }),
  ])

  const seatsLabel = entitlements.maxMembers === -1
    ? t("settingsPages.unlimitedMembers")
    : `${entitlements.maxMembers} ${t("dashboard.seats")}`

  // Pending invitations count toward seat usage — seat is "spoken for" the
  // moment the invite is sent, not when it's accepted. Anything else lets a
  // 1-seat free user spam invitations.
  const pendingCount = invitations.filter(
    (i) => i.status === "PENDING" && i.expiresAt.getTime() > Date.now(),
  ).length
  const seatsTaken = members.length + pendingCount
  const seatsFull =
    entitlements.maxMembers !== -1 && seatsTaken >= entitlements.maxMembers

  return (
    <TeamClient
      currentUserId={session.user.id}
      currentUserRole={(currentMembership?.role || "MEMBER") as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"}
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.userId,
        user: { name: m.user.name, email: m.user.email },
      }))}
      invitations={invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt.toISOString(),
      }))}
      seatsLabel={seatsLabel}
      count={members.length}
      seatsFull={seatsFull}
      maxMembers={entitlements.maxMembers}
    />
  )
}
