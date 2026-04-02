import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { Avatar } from "@/components/avatar"
import { auth } from "@/lib/auth"
import { getServerTranslation } from "@/lib/i18n-server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChangePasswordForm, DeleteAccountForm, EditNameForm, ResendVerificationForm } from "./forms"
import s from "./profile.module.scss"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const t = await getServerTranslation()

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  const signInMethod = user.hashedPassword ? t("settingsPages.emailPassword") : t("settingsPages.oauthMethod")

  return (
    <>
      <div className={s.card}>
        <div className={s.header}>
          <Avatar className={s.avatar} name={user.name || user.email} />
          <div>
            <div className={s.name}>{user.name || t("settingsPages.unnamed")}</div>
            <div className={s.email}>{user.email}</div>
          </div>
        </div>

        <div className={info.row}>
          <label>{t("settingsPages.emailLabel")}</label>
          <span>
            {user.email}
            {user.emailVerified ? " ✓" : ""}
          </span>
        </div>
        <div className={info.row}>
          <label>{t("settingsPages.signInMethod")}</label>
          <span>{signInMethod}</span>
        </div>
        <div className={info.row}>
          <label>{t("settingsPages.primarySuite")}</label>
          <span>
            {user.defaultSuite
              ? user.defaultSuite.charAt(0).toUpperCase() + user.defaultSuite.slice(1)
              : t("settingsPages.notSelected")}
          </span>
        </div>
        <div className={info.row}>
          <label>{t("settingsPages.memberSince")}</label>
          <span>
            {user.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </span>
        </div>
      </div>

      {!user.emailVerified && <ResendVerificationForm />}

      <EditNameForm currentName={user.name || ""} />

      {user.hashedPassword && <ChangePasswordForm />}

      <DeleteAccountForm />
    </>
  )
}
