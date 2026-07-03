import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"
import { resolveEntitlements } from "@/lib/entitlements"
import { isPaidPlan } from "@/lib/plans"

// Exporting/downloading the project code is a PAID-only feature: trial and
// post-trial (free) users can build, preview and use the live link, but must
// upgrade to at least Starter to extract the code. Admins bypass for support.
const DOWNLOAD_UPGRADE_MESSAGE =
  "Exporting your code requires a paid plan. Upgrade to Starter to download your project."

async function canDownload(session: {
  user?: { orgId?: string | null; isAdmin?: boolean }
}): Promise<boolean> {
  if (session.user?.isAdmin) return true
  const orgId = session.user?.orgId
  if (!orgId) return false
  const { planKey } = await resolveEntitlements(orgId)
  return isPaidPlan(planKey)
}

/** GET: fetch download info (cost, quota) — plus whether a paid plan is required. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const allowed = await canDownload(result.session)

  const res = await brokerProxy(`project/${id}/download`, result.token)
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    data?: unknown
    error?: string
  }
  // Broker wraps its payload as { success, data: {...fields} }. Unwrap once so
  // clients see a single-level { success, data: {...fields} }.
  const payload = body && typeof body === "object" && "data" in body ? body.data : body
  const data =
    payload && typeof payload === "object"
      ? { ...(payload as Record<string, unknown>), requiresPaidPlan: !allowed }
      : { requiresPaidPlan: !allowed }
  return NextResponse.json(
    res.ok ? { success: true, data } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}

/** POST: trigger download (returns ZIP blob) */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  // Hard gate: only paid plans may export the code. Blocks the "build on a free
  // trial then download the ZIP and walk away" path before it reaches the broker.
  if (!(await canDownload(result.session))) {
    return NextResponse.json(
      { success: false, error: DOWNLOAD_UPGRADE_MESSAGE, requiresPaidPlan: true },
      { status: 402 },
    )
  }

  const res = await brokerProxy(`project/${id}/download`, result.token, { method: "POST" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const headers: Record<string, string> = {}
    const retryAfter = res.headers.get("Retry-After")
    if (retryAfter) headers["Retry-After"] = retryAfter
    return NextResponse.json(
      { success: false, error: (data as { error?: string }).error || "Download failed" },
      { status: res.status, headers },
    )
  }

  const blob = await res.arrayBuffer()
  return new Response(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="project-${id}.zip"`,
    },
  })
}
