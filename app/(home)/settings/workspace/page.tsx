import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"

export default async function WorkspacePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const org = await prisma.organization.findUnique({ where: { id: session.user.orgId } })
  if (!org) redirect("/dashboard")

  return (
    <div className={s.card}>
      <h2 className={s.cardTitle}>Workspace</h2>
      <div className={s.infoRow}>
        <label>Name</label>
        <span>{org.name}</span>
      </div>
      <div className={s.infoRow}>
        <label>Slug</label>
        <span>{org.slug}</span>
      </div>
      {org.websiteUrl && (
        <div className={s.infoRow}>
          <label>Website</label>
          <span>{org.websiteUrl}</span>
        </div>
      )}
      <div className={s.infoRow}>
        <label>Created</label>
        <span>{org.createdAt.toLocaleDateString()}</span>
      </div>
    </div>
  )
}
