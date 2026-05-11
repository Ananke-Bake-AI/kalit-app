import { requireAdmin } from "@/lib/admin"
import { getAdminFeaturedProjects } from "@/server/actions/admin"
import { FeaturedProjectsClient } from "./featured-projects-client"

export default async function AdminFeaturedProjectsPage() {
  await requireAdmin()
  const result = await getAdminFeaturedProjects()
  if ("error" in result) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
        {result.error}
      </div>
    )
  }
  return <FeaturedProjectsClient initial={result.projects} />
}
