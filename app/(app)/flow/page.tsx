import { SuiteGate } from "@/components/app/suite-gate"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FlowDashboard } from "./dashboard"

export default async function FlowPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const sites = await prisma.flowSite.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <SuiteGate suiteId="flow">
      <FlowDashboard sites={sites} />
    </SuiteGate>
  )
}
