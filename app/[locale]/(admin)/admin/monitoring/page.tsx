import { requireAdmin } from "@/lib/admin"
import { getAdminJobs, getAdminUsageRecords } from "@/server/actions/admin"
import { MonitoringClient } from "./monitoring-client"

export default async function AdminMonitoringPage() {
  await requireAdmin()

  const [jobs, usage] = await Promise.all([
    getAdminJobs({ page: 1, limit: 20 }),
    getAdminUsageRecords({ page: 1, limit: 20 })
  ])

  return <MonitoringClient initialJobs={jobs} initialUsage={usage} />
}
