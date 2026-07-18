import { requireAdmin } from "@/lib/admin"
import {
  getAdminActiveBuilds,
  getAdminRecentProjects,
  getAdminUsageRecords
} from "@/server/actions/admin"
import { MonitoringClient } from "./monitoring-client"

export default async function AdminMonitoringPage() {
  await requireAdmin()

  const [builds, projects, usage] = await Promise.all([
    getAdminActiveBuilds(),
    getAdminRecentProjects({ page: 1, limit: 20 }),
    getAdminUsageRecords({ page: 1, limit: 20 })
  ])

  return (
    <MonitoringClient
      initialBuilds={builds}
      initialProjects={projects}
      initialUsage={usage}
    />
  )
}
