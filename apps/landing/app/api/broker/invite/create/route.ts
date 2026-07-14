import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// POST : le propriétaire du projet crée un lien d'invitation (partage à plusieurs).
// Le broker vérifie l'ownership (403/404 sinon) et renvoie { token, url }.
export async function POST(request: NextRequest) {
  const result = await authAndToken()
  if ("error" in result) return result.error

  const reqBody = await request.text()
  const res = await brokerProxy("invite/create", result.token, {
    method: "POST",
    body: reqBody,
    headers: { "Content-Type": "application/json" },
  })
  const body = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string }
  const payload = body && typeof body === "object" && "data" in body ? body.data : body
  return NextResponse.json(
    res.ok ? { success: true, data: payload } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}
