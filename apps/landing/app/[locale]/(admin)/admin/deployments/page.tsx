import { requireAdmin } from "@/lib/admin"
import { getDeployments } from "@/server/actions/admin"
import { DeploymentsClient } from "./deployments-client"

export default async function AdminDeploymentsPage() {
  await requireAdmin()
  const deployments = await getDeployments()

  return <DeploymentsClient initialData={deployments} />
}
