import { requireAdmin } from "@/lib/admin"
import { getCampaignStats } from "@/server/actions/admin"
import { CampaignsClient } from "./campaigns-client"

export default async function AdminCampaignsPage() {
  await requireAdmin()
  const stats = await getCampaignStats()

  return <CampaignsClient initialStats={stats} />
}
