import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`project/${id}/status`, result.token)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(
    res.ok ? { success: true, data } : { success: false, error: (data as { error?: string }).error || "Failed" },
    { status: res.status },
  )
}
