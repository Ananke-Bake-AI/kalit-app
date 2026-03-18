import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { SUITES } from "@/lib/suites"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Container } from "@/components/container"
import { Button } from "@/components/button"
import { Logo } from "@/components/logo"
import { FlowDashboard } from "./dashboard"
import s from "../app.module.scss"

export default async function FlowPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "flow")
  const suite = SUITES.find((st) => st.id === "flow")!

  if (!hasAccess) {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>
              <Logo id="flow" style={{ width: 24, height: 24 }} />
            </div>
            <h3>Kalit {suite.title}</h3>
            <p>{suite.description}</p>
            <Button href="/settings/billing">Upgrade to unlock</Button>
          </div>
        </Container>
      </section>
    )
  }

  const sites = await prisma.flowSite.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <section className={s.page}>
      <Container>
        <FlowDashboard sites={sites} />
      </Container>
    </section>
  )
}
