import { auth } from "@/lib/auth"
import { checkSuiteAccess } from "@/lib/entitlements"
import { getSuite, type SuiteId } from "@/lib/app-suites"
import { Lock } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

interface SuiteGateProps {
  suiteId: SuiteId
  children: React.ReactNode
}

export async function SuiteGate({ suiteId, children }: SuiteGateProps) {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const hasAccess = await checkSuiteAccess(session.user.orgId, suiteId)
  const suite = getSuite(suiteId)

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="rounded-full bg-muted p-4">
          <Lock className="h-8 w-8 text-muted-fg" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Kalit {suite.name} is locked
        </h2>
        <p className="max-w-md text-sm text-muted-fg">
          {suite.description}
        </p>
        <Link
          href="/settings/billing"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          Upgrade to unlock
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
