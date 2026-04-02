import { Badge } from "@/components/badge"
import { auth } from "@/lib/auth"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"

export default async function WorkspacePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect(await localeHref("/login"))
  const { t } = await getServerTranslation()

  const org = await prisma.organization.findUnique({ where: { id: session.user.orgId } })

  if (!org) redirect(await localeHref("/dashboard"))

  return (
    <SurfacePanel
      title={t("settingsPages.workspaceIdentity")}
      subtitle={t("settingsPages.workspaceIdentityDesc")}
      headerAside={<Badge>{org.slug}</Badge>}
    >
      <div className={info.row}>
        <label>{t("settingsPages.nameLabel")}</label>
        <span>{org.name}</span>
      </div>
      <div className={info.row}>
        <label>{t("settingsPages.slugLabel")}</label>
        <span>{org.slug}</span>
      </div>
      <div className={info.row}>
        <label>{t("settingsPages.websiteLabel")}</label>
        <span>{org.websiteUrl || t("settingsPages.noWebsite")}</span>
      </div>
      <div className={info.row}>
        <label>{t("settingsPages.createdLabel")}</label>
        <span>
          {org.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
    </SurfacePanel>
  )
}
