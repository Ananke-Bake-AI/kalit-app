import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { redirect } from "next/navigation"
import { SuiteWorkspaceView } from "@/components/suite-workspace-view"

export default async function ProjectPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "project")

  return (
    <SuiteWorkspaceView suiteId="project" launcherDisplayName="Project" hasAccess={hasAccess} />
  )
}
