import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// GET ?projectId=… : liste les invitations actives d'un projet (propriétaire only,
// vérifié côté broker). Renvoie { invites: [...] }.
export async function GET(request: NextRequest) {
  const result = await authAndToken()
  if ("error" in result) return result.error

  const projectId = request.nextUrl.searchParams.get("projectId") || ""
  const res = await brokerProxy(`invite/list?projectId=${encodeURIComponent(projectId)}`, result.token)
  const body = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string }
  const payload = body && typeof body === "object" && "data" in body ? body.data : body
  return NextResponse.json(
    res.ok ? { success: true, data: payload } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}
