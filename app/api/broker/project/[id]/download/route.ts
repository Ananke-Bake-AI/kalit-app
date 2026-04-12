import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

/** GET: fetch download info (cost, quota) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`project/${id}/download`, result.token)
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(
    res.ok ? { success: true, data } : { success: false, error: (data as { error?: string }).error || "Failed" },
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

  const res = await brokerProxy(`project/${id}/download`, result.token, { method: "POST" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(
      { success: false, error: (data as { error?: string }).error || "Download failed" },
      { status: res.status },
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
