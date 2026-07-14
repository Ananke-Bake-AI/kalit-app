import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// POST : l'utilisateur connecté accepte une invitation. Le broker valide le token
// (révoqué/expiré/uses/e-mail) puis crée le membership, et renvoie
// { externalProjectId, role, sessionId } (la session propriétaire à ouvrir).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: inviteToken } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`invite/${encodeURIComponent(inviteToken)}/accept`, result.token, {
    method: "POST",
    body: "{}",
    headers: { "Content-Type": "application/json" },
  })
  const body = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string }
  const payload = body && typeof body === "object" && "data" in body ? body.data : body
  return NextResponse.json(
    res.ok ? { success: true, data: payload } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}
