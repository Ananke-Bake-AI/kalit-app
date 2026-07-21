import { requireAdmin } from "@/lib/admin"
import { getAdminModels } from "@/server/actions/admin"
import { ModelsClient } from "./models-client"

export default async function AdminModelsPage() {
  await requireAdmin()
  const models = await getAdminModels()
  return <ModelsClient initialModels={models} />
}
