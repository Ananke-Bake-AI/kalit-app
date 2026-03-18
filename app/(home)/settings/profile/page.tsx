import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  const initial = user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()

  return (
    <div className={s.profileCard}>
      <div className={s.profileHeader}>
        <div className={s.profileAvatar}>{initial}</div>
        <div>
          <div className={s.profileName}>{user.name || "Unnamed"}</div>
          <div className={s.profileEmail}>{user.email}</div>
        </div>
      </div>
      <div className={s.infoRow}>
        <label>Name</label>
        <span>{user.name || "Not set"}</span>
      </div>
      <div className={s.infoRow}>
        <label>Email</label>
        <span>{user.email}</span>
      </div>
      <div className={s.infoRow}>
        <label>Account type</label>
        <span>{user.hashedPassword ? "Email & password" : "OAuth (Google/GitHub)"}</span>
      </div>
      <div className={s.infoRow}>
        <label>Member since</label>
        <span>{user.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
    </div>
  )
}
