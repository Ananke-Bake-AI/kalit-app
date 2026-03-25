import { Badge } from "@/components/badge"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import info from "@/components/settings-info-rows/settings-info-rows.module.scss"
import { SurfacePanel } from "@/components/surface-panel"

export default async function WorkspacePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const org = await prisma.organization.findUnique({ where: { id: session.user.orgId } })

  if (!org) redirect("/dashboard")

  return (
    <SurfacePanel
      title="Workspace identity"
      subtitle="The organization record that powers billing, access, and data ownership across the Kalit suite."
      headerAside={<Badge>{org.slug}</Badge>}
    >
      <div className={info.row}>
        <label>Name</label>
        <span>{org.name}</span>
      </div>
      <div className={info.row}>
        <label>Slug</label>
        <span>{org.slug}</span>
      </div>
      <div className={info.row}>
        <label>Website</label>
        <span>{org.websiteUrl || "No website added yet"}</span>
      </div>
      <div className={info.row}>
        <label>Created</label>
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
