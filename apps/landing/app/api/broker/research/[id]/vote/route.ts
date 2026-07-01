import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const body = (await request.json().catch(() => ({}))) as { vote?: string }
  const res = await brokerProxy(`research/${id}/vote`, result.token, {
    method: "POST",
    body: JSON.stringify({ vote: body.vote ?? "" }),
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(
    res.ok ? data : { success: false, error: (data as { error?: string }).error || "Failed" },
    { status: res.status },
  )
}
