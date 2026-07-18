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

  // RAM previews are served from the BROKER origin (broker-api.kalit.ai), not
  // proxied under kalit.ai — the dev-server's absolute asset paths (/@vite/…,
  // /src/…) must resolve against the broker root. Same source as the share page.
  const brokerPublic = (
    process.env.NEXT_PUBLIC_BROKER_URL ||
    process.env.BROKER_URL ||
    ""
  ).replace(/\/+$/, "")

  return (
    <MonitoringClient
      brokerPublic={brokerPublic}
      initialBuilds={builds}
      initialProjects={projects}
      initialUsage={usage}
    />
  )
}
