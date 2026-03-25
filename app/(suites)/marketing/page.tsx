import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { redirect } from "next/navigation"
import { SuiteWorkspaceView } from "@/components/suite-workspace-view"

export default async function MarketingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "marketing")

  return (
    <SuiteWorkspaceView
      suiteId="marketing"
      launcherDisplayName="Marketing"
      hasAccess={hasAccess}
    />
  )
}
