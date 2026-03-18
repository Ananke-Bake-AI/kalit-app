import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/app/card"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-muted-fg">Name</label>
          <p className="text-foreground">{user.name || "Not set"}</p>
        </div>
        <div>
          <label className="text-sm text-muted-fg">Email</label>
          <p className="text-foreground">{user.email}</p>
        </div>
        <div>
          <label className="text-sm text-muted-fg">Member since</label>
          <p className="text-foreground">{user.createdAt.toLocaleDateString()}</p>
        </div>
      </div>
    </Card>
  )
}
