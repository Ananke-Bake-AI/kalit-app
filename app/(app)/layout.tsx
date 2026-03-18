import "@/styles/app-tailwind.css"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveEntitlements } from "@/lib/entitlements"
import { Sidebar } from "@/components/app/sidebar"
import { redirect } from "next/navigation"
import type { SuiteId } from "@/lib/app-suites"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (!session.user.onboardingDone) redirect("/setup")

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isCurrent: true },
    include: { org: true },
  })

  if (!membership) redirect("/setup")

  const entitlements = await resolveEntitlements(membership.orgId)
  const enabledSuites = (Object.entries(entitlements.suites)
    .filter(([, v]) => v)
    .map(([k]) => k)) as SuiteId[]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgName={membership.org.name} enabledSuites={enabledSuites} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
