import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const members = await prisma.membership.findMany({
    where: { orgId: session.user.orgId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className={s.card}>
      <h2 className={s.cardTitle}>Team members ({members.length})</h2>
      {members.map((m) => (
        <div key={m.id} className={s.memberRow}>
          <div className={s.memberInfo}>
            <div className={s.memberName}>{m.user.name || m.user.email}</div>
            <div className={s.memberEmail}>{m.user.email}</div>
          </div>
          <span className={s.memberRole}>{m.role}</span>
        </div>
      ))}
    </div>
  )
}
