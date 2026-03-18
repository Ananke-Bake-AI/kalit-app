import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/app/card"
import { redirect } from "next/navigation"

export default async function WorkspacePage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  })
  if (!org) redirect("/dashboard")

  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground mb-4">Workspace</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-muted-fg">Name</label>
          <p className="text-foreground">{org.name}</p>
        </div>
        <div>
          <label className="text-sm text-muted-fg">Slug</label>
          <p className="text-foreground font-mono text-sm">{org.slug}</p>
        </div>
        {org.websiteUrl && (
          <div>
            <label className="text-sm text-muted-fg">Website</label>
            <p className="text-foreground">{org.websiteUrl}</p>
          </div>
        )}
        <div>
          <label className="text-sm text-muted-fg">Created</label>
          <p className="text-foreground">{org.createdAt.toLocaleDateString()}</p>
        </div>
      </div>
    </Card>
  )
}
