import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { SUITES } from "@/lib/suites"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Container } from "@/components/container"
import { Button } from "@/components/button"
import { Logo } from "@/components/logo"
import { MarketingDashboard } from "./dashboard"
import s from "../app.module.scss"

export default async function MarketingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "marketing")
  const suite = SUITES.find((st) => st.id === "marketing")!

  if (!hasAccess) {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>
              <Logo id="marketing" style={{ width: 24, height: 24 }} />
            </div>
            <h3>Kalit {suite.title}</h3>
            <p>{suite.description}</p>
            <Button href="/settings/billing">Upgrade to unlock</Button>
          </div>
        </Container>
      </section>
    )
  }

  const campaigns = await prisma.marketingCampaign.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <section className={s.page}>
      <Container>
        <MarketingDashboard campaigns={campaigns} />
      </Container>
    </section>
  )
}
