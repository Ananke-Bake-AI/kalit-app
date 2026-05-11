import { listBugReports } from "@/server/actions/admin"
import { BugReportsClient } from "./bug-reports-client"

export const dynamic = "force-dynamic"

export default async function BugReportsPage() {
  const result = await listBugReports()
  const initial = "reports" in result ? result.reports : []
  return <BugReportsClient initial={initial} />
}
