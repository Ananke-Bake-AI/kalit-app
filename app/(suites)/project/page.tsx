import { SuiteWorkspaceView } from "@/components/suite-workspace-view"
import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { MetadataSeo } from "@/lib/metadata"
import { redirect } from "next/navigation"

export const viewport = {
  themeColor: "#8200DF"
}

export const metadata = MetadataSeo({
  fullTitle: "Kalit Project — Build applications with AI",
  description:
    "Build and deploy full applications from a prompt. AI agents plan, build, test, and ship your product end-to-end.",
  favicon: "/favicon-project.svg",
  image: "/img/thumbnail-project.jpg"
})

export default async function ProjectPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "project")

  return <SuiteWorkspaceView suiteId="project" launcherDisplayName="Project" hasAccess={hasAccess} />
}
