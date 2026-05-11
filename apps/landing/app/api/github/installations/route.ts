import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getGitHubAppConfig } from "@/lib/github-app"
import { authUserFromRequest } from "@/lib/jwt-verify"

// GET /api/github/installations
// Returns the current user's GitHub App installations. The `configured` flag
// tells the client whether the GitHub App is set up at all — if not, the UI
// falls back to the manual PAT form.
export async function GET(req: Request) {
  const user = await authUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return NextResponse.json({ configured: false, installations: [] })
  }
  const rows = await prisma.gitHubInstallation.findMany({
    where: { userId: user.id, suspended: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      installationId: true,
      accountLogin: true,
      accountType: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ configured: true, installations: rows })
}
