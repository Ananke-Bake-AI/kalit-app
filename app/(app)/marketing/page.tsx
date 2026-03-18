import { SuiteGate } from "@/components/app/suite-gate"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MarketingDashboard } from "./dashboard"

export default async function MarketingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const campaigns = await prisma.marketingCampaign.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <SuiteGate suiteId="marketing">
      <MarketingDashboard campaigns={campaigns} />
    </SuiteGate>
  )
}
