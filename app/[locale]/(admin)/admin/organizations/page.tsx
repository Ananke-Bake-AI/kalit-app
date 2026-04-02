import { requireAdmin } from "@/lib/admin"
import { getAdminOrganizations } from "@/server/actions/admin"
import { OrgsClient } from "./orgs-client"

export default async function AdminOrganizationsPage() {
  await requireAdmin()
  const data = await getAdminOrganizations({ page: 1, limit: 30 })

  return <OrgsClient initialData={data} />
}
