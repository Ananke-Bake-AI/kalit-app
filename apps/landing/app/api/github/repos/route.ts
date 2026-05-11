import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getGitHubAppConfig,
  listInstallationRepos,
  mintInstallationToken,
} from "@/lib/github-app"
import { authUserFromRequest } from "@/lib/jwt-verify"

// GET /api/github/repos?installationId=...
// Lists the repositories the user authorized on a given installation.
// Ownership check: the installation must belong to the caller.
export async function GET(req: NextRequest) {
  const user = await authUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: "GitHub App is not configured" },
      { status: 503 },
    )
  }
  const installationId = new URL(req.url).searchParams.get("installationId")
  if (!installationId) {
    return NextResponse.json({ error: "installationId is required" }, { status: 400 })
  }
  const row = await prisma.gitHubInstallation.findUnique({
    where: { installationId },
  })
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Installation not found" }, { status: 404 })
  }

  try {
    const minted = await mintInstallationToken(cfg, installationId)
    const repos = await listInstallationRepos(minted.token)
    return NextResponse.json({
      repos: repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        private: r.private,
        defaultBranch: r.default_branch,
        description: r.description,
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
