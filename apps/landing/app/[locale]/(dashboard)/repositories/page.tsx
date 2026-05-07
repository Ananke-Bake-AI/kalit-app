import { auth } from "@/lib/auth"
import { localeHref } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { listRepositories } from "@/server/actions/repositories"
import { RepositoriesClient } from "./repositories-client"

export default async function RepositoriesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect(await localeHref("/login"))

  const initial = await listRepositories(false)
  if ("error" in initial) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
        {initial.error}
      </div>
    )
  }

  return (
    <RepositoriesClient
      initial={initial.projects}
      count={initial.count}
      cap={initial.cap}
    />
  )
}
