import { requireAdmin } from "@/lib/admin"
import { getAdminUsers } from "@/server/actions/admin"
import { UsersClient } from "./users-client"

export default async function AdminUsersPage() {
  await requireAdmin()
  const data = await getAdminUsers({ page: 1, limit: 30 })

  return <UsersClient initialData={data} />
}
