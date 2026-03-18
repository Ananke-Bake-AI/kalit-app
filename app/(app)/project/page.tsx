import { SuiteGate } from "@/components/app/suite-gate"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProjectDashboard } from "./dashboard"

export default async function ProjectPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const apps = await prisma.projectApp.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <SuiteGate suiteId="project">
      <ProjectDashboard apps={apps} />
    </SuiteGate>
  )
}
