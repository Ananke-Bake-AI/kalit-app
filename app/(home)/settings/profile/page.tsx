import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import s from "../../app.module.scss"
import { EditNameForm, ChangePasswordForm } from "./forms"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  const initial = user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()
  const signInMethod = user.hashedPassword ? "Email and password" : "OAuth via Google or GitHub"

  return (
    <>
      <div className={s.profileCard}>
        <div className={s.profileHeader}>
          <div className={s.profileAvatar}>{initial}</div>
          <div>
            <div className={s.profileName}>{user.name || "Unnamed user"}</div>
            <div className={s.profileEmail}>{user.email}</div>
          </div>
        </div>

        <div className={s.infoRow}>
          <label>Email</label>
          <span>
            {user.email}
            {user.emailVerified ? " ✓" : ""}
          </span>
        </div>
        <div className={s.infoRow}>
          <label>Sign-in method</label>
          <span>{signInMethod}</span>
        </div>
        <div className={s.infoRow}>
          <label>Primary suite</label>
          <span>{user.defaultSuite ? user.defaultSuite.charAt(0).toUpperCase() + user.defaultSuite.slice(1) : "Not selected"}</span>
        </div>
        <div className={s.infoRow}>
          <label>Member since</label>
          <span>{user.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      <EditNameForm currentName={user.name || ""} />

      {user.hashedPassword && <ChangePasswordForm />}
    </>
  )
}
