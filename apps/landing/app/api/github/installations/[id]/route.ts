import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getGitHubAppConfig, revokeInstallation } from "@/lib/github-app"
import { authUserFromRequest } from "@/lib/jwt-verify"

// DELETE /api/github/installations/[id]
// Unlinks a GitHub App installation from the authenticated user. `id` is the
// installationId (not the DB row id). We revoke on GitHub first so the app
// is cleanly uninstalled there, then drop the DB row so the chip disappears
// from the importer.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return NextResponse.json({ error: "GitHub App is not configured" }, { status: 400 })
  }

  const { id } = await params
  const row = await prisma.gitHubInstallation.findUnique({
    where: { installationId: id },
    select: { id: true, userId: true, installationId: true },
  })
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    await revokeInstallation(cfg, row.installationId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub revoke failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await prisma.gitHubInstallation.delete({ where: { id: row.id } })
  return NextResponse.json({ ok: true })
}
