import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { redirect } from "next/navigation"
import { SuiteWorkspaceView } from "@/components/suite-workspace-view"

export default async function SearchPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "search")

  return (
    <SuiteWorkspaceView
      suiteId="search"
      launcherDisplayName="Search"
      hasAccess={hasAccess}
    />
  )
}
