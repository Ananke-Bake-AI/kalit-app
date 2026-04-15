import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getGitHubAppConfig,
  mintInstallationToken,
} from "@/lib/github-app"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// POST /api/github/attach
// Body: { sessionId, installationId, owner, repo, branch? }
// Mints a short-lived installation token server-side and forwards it to the
// broker's attach-repo endpoint. The browser never sees the token.
export async function POST(req: NextRequest) {
  const ctx = await authAndToken()
  if ("error" in ctx) return ctx.error
  const { token: brokerToken, session } = ctx

  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: "GitHub App is not configured" },
      { status: 503 },
    )
  }

  let body: {
    sessionId?: string
    installationId?: string
    owner?: string
    repo?: string
    branch?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const { sessionId, installationId, owner, repo, branch } = body
  if (!sessionId || !installationId || !owner || !repo) {
    return NextResponse.json(
      { error: "sessionId, installationId, owner and repo are required" },
      { status: 400 },
    )
  }

  const row = await prisma.gitHubInstallation.findUnique({
    where: { installationId },
  })
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Installation not found" }, { status: 404 })
  }

  // Mint a fresh installation token (1h TTL). The broker holds it in memory
  // for the duration of the session's git operations.
  let ghToken: string
  try {
    const minted = await mintInstallationToken(cfg, installationId)
    ghToken = minted.token
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: `Could not mint GitHub token: ${msg}` }, { status: 502 })
  }

  const cloneUrl = `https://github.com/${owner}/${repo}.git`
  const brokerBody = JSON.stringify({
    url: cloneUrl,
    username: "x-access-token",
    token: ghToken,
    branch: (branch || "").trim(),
  })

  const brokerRes = await brokerProxy(
    `sessions/${encodeURIComponent(sessionId)}/attach-repo`,
    brokerToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: brokerBody,
    },
  )
  const brokerText = await brokerRes.text()
  if (!brokerRes.ok) {
    const parsedErr = safeParseError(brokerText)
    const preview = brokerText.length > 400 ? `${brokerText.slice(0, 400)}…` : brokerText
    const detail = parsedErr || preview || "(empty body)"
    console.error(
      `[github/attach] broker refused: status=${brokerRes.status} body=${preview}`,
    )
    return NextResponse.json(
      {
        error: `Broker refused attach (${brokerRes.status}): ${detail}`,
        brokerStatus: brokerRes.status,
        brokerBody: preview,
      },
      { status: brokerRes.status },
    )
  }

  const parsed = safeParseJson(brokerText)
  return NextResponse.json({
    attached: true,
    url: cloneUrl,
    username: "x-access-token",
    branch: branch?.trim() || null,
    hasToken: true,
    broker: parsed,
  })
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
function safeParseError(s: string): string | null {
  const j = safeParseJson(s) as { error?: string } | null
  return j?.error ?? null
}
