import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  return (
    <div className={s.card}>
      <h2 className={s.cardTitle}>Profile</h2>
      <div className={s.infoRow}>
        <label>Name</label>
        <span>{user.name || "Not set"}</span>
      </div>
      <div className={s.infoRow}>
        <label>Email</label>
        <span>{user.email}</span>
      </div>
      <div className={s.infoRow}>
        <label>Member since</label>
        <span>{user.createdAt.toLocaleDateString()}</span>
      </div>
    </div>
  )
}
