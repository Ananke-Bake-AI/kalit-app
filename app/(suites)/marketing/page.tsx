import { SuiteWorkspaceView } from "@/components/suite-workspace-view"
import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { MetadataSeo } from "@/lib/metadata"
import { redirect } from "next/navigation"

export const viewport = {
  themeColor: "#2F44FF"
}

export const metadata = MetadataSeo({
  fullTitle: "Kalit Marketing — Plan, create, run, and optimize acquisition campaigns",
  description: "Plan, create, run, and optimize acquisition campaigns across channels. AI handles the execution.",
  favicon: "/favicon-marketing.svg",
  image: "/img/thumbnail-marketing.jpg"
})

export default async function MarketingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, "marketing")

  return <SuiteWorkspaceView suiteId="marketing" launcherDisplayName="Marketing" hasAccess={hasAccess} />
}
