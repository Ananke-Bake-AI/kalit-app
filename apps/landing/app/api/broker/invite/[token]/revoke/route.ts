import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// POST : le créateur de l'invitation la révoque (le broker vérifie created_by).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: inviteToken } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`invite/${encodeURIComponent(inviteToken)}/revoke`, result.token, {
    method: "POST",
    body: "{}",
    headers: { "Content-Type": "application/json" },
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return NextResponse.json(
    res.ok ? { success: true } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}
